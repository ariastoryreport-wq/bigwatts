/**
 * Backend Warmup Service
 * 
 * Render.com free tier puts the backend to sleep after 15 min of inactivity.
 * This service wakes up the backend proactively when the app loads.
 * 
 * External cron services (like cron-job.org or UptimeRobot) can also ping
 * the /api/health/ endpoint every 14 minutes to keep it awake.
 */

const API_URL = import.meta.env.VITE_API_URL || '';
const HEALTH_ENDPOINT = `${API_URL}/api/health/`;

// Cache to avoid multiple wake-up attempts
let warmupPromise = null;
let isBackendReady = false;

/**
 * Wake up the backend by pinging the health endpoint.
 * Retries up to 3 times with increasing delays to handle cold starts.
 * @returns {Promise<boolean>} true if backend is ready
 */
export async function wakeBackend() {
  // If already warming up, return existing promise
  if (warmupPromise) return warmupPromise;
  
  // If already confirmed ready, return immediately
  if (isBackendReady) return Promise.resolve(true);

  warmupPromise = (async () => {
    const maxRetries = 4;
    const delays = [0, 3000, 6000, 10000]; // Immediate, 3s, 6s, 10s

    for (let i = 0; i < maxRetries; i++) {
      if (i > 0) {
        await new Promise(r => setTimeout(r, delays[i]));
      }
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch(HEALTH_ENDPOINT, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          isBackendReady = true;
          console.log('✅ Backend is ready');
          return true;
        }
      } catch (error) {
        console.log(`⏳ Backend warming up... (attempt ${i + 1}/${maxRetries})`);
      }
    }

    console.warn('⚠️ Backend may still be starting...');
    return false;
  })();

  const result = await warmupPromise;
  warmupPromise = null;
  return result;
}

/**
 * Check if backend is currently ready (based on last check)
 */
export function isReady() {
  return isBackendReady;
}

/**
 * Reset the ready state (useful for testing or after errors)
 */
export function resetState() {
  isBackendReady = false;
  warmupPromise = null;
}

export default { wakeBackend, isReady, resetState };
