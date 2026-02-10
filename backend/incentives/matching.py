"""
Deterministic rule-based incentive matching engine.
No AI / external API needed — pure business logic.
"""
from decimal import Decimal
from .models import IncentiveProgram


def match_incentives(data: dict) -> list[dict]:
    """
    Given validated wizard data, return a ranked list of matched incentive
    dicts with an `estimated_savings` and `explanation` for each.
    """
    country = data.get('country', 'FR')
    region = data.get('region', '')
    installation_type = data['installation_type']
    property_type = data['property_type']
    is_owner = data.get('is_owner', True)
    annual_income = data.get('annual_income')  # may be None
    estimated_budget = data.get('estimated_budget')  # may be None

    # ------------------------------------------------------------------
    # Step 1 – Query candidates (active, correct country)
    # ------------------------------------------------------------------
    qs = IncentiveProgram.objects.filter(active=True, country=country)

    # ------------------------------------------------------------------
    # Step 2 – Filter in Python (JSONField filtering is database-dependent)
    # ------------------------------------------------------------------
    results = []
    for prog in qs:
        score = 0  # higher = better match

        # Installation type check
        if prog.installation_types and installation_type not in prog.installation_types:
            continue
        if installation_type in (prog.installation_types or []):
            score += 10

        # Property type check
        if prog.property_types and property_type not in prog.property_types:
            continue
        if property_type in (prog.property_types or []):
            score += 5

        # Region match: national (empty) matches everyone; region-specific is bonus
        if prog.region:
            if region and prog.region.lower() != region.lower():
                continue  # wrong region
            if not region:
                continue  # user didn't specify a region but program is regional
            score += 8  # exact region match

        # Income bounds
        if annual_income is not None:
            income = Decimal(str(annual_income))
            if prog.income_max is not None and income > prog.income_max:
                continue
            if prog.income_min is not None and income < prog.income_min:
                continue
            score += 3

        # Ownership rule from eligibility_rules
        rules = prog.eligibility_rules or {}
        if rules.get('owner_only') and not is_owner:
            continue

        # ------------------------------------------------------------------
        # Step 3 – Estimate savings
        # ------------------------------------------------------------------
        estimated_savings = None
        if estimated_budget is not None and prog.discount_percent:
            raw = Decimal(str(estimated_budget)) * prog.discount_percent / Decimal('100')
            if prog.max_amount is not None:
                raw = min(raw, prog.max_amount)
            estimated_savings = float(round(raw, 2))
        elif prog.max_amount is not None:
            estimated_savings = float(prog.max_amount)

        # Boost score by savings magnitude
        if estimated_savings:
            score += min(int(estimated_savings / 500), 20)

        # ------------------------------------------------------------------
        # Step 4 – Build human-readable explanation
        # ------------------------------------------------------------------
        explanation = _build_explanation(prog, data, estimated_savings)

        results.append({
            'id': prog.id,
            'name': prog.name,
            'provider_type': prog.provider_type,
            'region': prog.region or 'National',
            'discount_percent': float(prog.discount_percent),
            'max_amount': float(prog.max_amount) if prog.max_amount else None,
            'estimated_savings': estimated_savings,
            'description': prog.description,
            'official_url': prog.official_url,
            'explanation': explanation,
            'score': score,
        })

    # Sort by score desc, then estimated savings desc
    results.sort(key=lambda r: (r['score'], r.get('estimated_savings') or 0), reverse=True)
    return results


# -----------------------------------------------------------------------
# Template-based "AI-like" explanation (no OpenAI required)
# -----------------------------------------------------------------------

_INSTALLATION_LABELS = {
    'solar': 'panneaux solaires',
    'heat_pump': 'pompe à chaleur',
    'ev_charger': 'borne de recharge véhicule électrique',
    'insulation': 'isolation thermique',
    'battery': 'batterie de stockage',
    'wind': 'éolienne domestique',
}

_PROPERTY_LABELS = {
    'house': 'maison individuelle',
    'apartment': 'appartement',
    'commercial': 'local commercial',
    'other': 'bien immobilier',
}


def _build_explanation(prog, data, estimated_savings) -> str:
    inst_label = _INSTALLATION_LABELS.get(data['installation_type'], data['installation_type'])
    prop_label = _PROPERTY_LABELS.get(data['property_type'], data['property_type'])
    parts = []

    parts.append(
        f"Le programme « {prog.name} » vous aide à financer votre projet "
        f"d'installation de {inst_label} pour votre {prop_label}."
    )

    if prog.discount_percent:
        parts.append(
            f"Il couvre jusqu'à {prog.discount_percent:.0f} % du coût des travaux"
            + (f" (plafonné à {prog.max_amount:,.0f} €)" if prog.max_amount else "")
            + "."
        )

    if estimated_savings:
        parts.append(
            f"Sur la base de votre budget estimé, vous pourriez économiser environ "
            f"{estimated_savings:,.0f} €."
        )

    if prog.region:
        parts.append(f"Cette aide est spécifique à la région {prog.region}.")
    else:
        parts.append("Ce dispositif est disponible sur l'ensemble du territoire national.")

    rules = prog.eligibility_rules or {}
    if rules.get('owner_only'):
        parts.append("Réservé aux propriétaires occupants.")
    if rules.get('built_before'):
        parts.append(f"Le logement doit avoir été construit avant {rules['built_before']}.")

    return ' '.join(parts)
