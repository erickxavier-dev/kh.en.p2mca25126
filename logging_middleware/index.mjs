let currentToken = '';

function setAuthToken(token) {
    currentToken = token;
}

const validLevels = ['debug', 'info', 'warn', 'error', 'fatal'];

const backendPackages = ['cache', 'controller', 'cronjob', 'db', 'domain', 'handler', 'repository', 'route', 'service'];
const frontendPackages = ['api', 'component', 'hook', 'page', 'state', 'style'];
const sharedPackages = ['auth', 'config', 'middleware', 'utils'];

function isValidPackage(stack, pkg) {
    if (sharedPackages.includes(pkg)) return true;
    if (stack === 'backend') return backendPackages.includes(pkg);
    if (stack === 'frontend') return frontendPackages.includes(pkg);
    return false;
}

async function Log(stack, level, pkg, message) {
    if (stack !== 'backend' && stack !== 'frontend') return;
    if (!validLevels.includes(level)) return;
    if (!isValidPackage(stack, pkg)) return;

    try {
        const resp = await fetch('http://20.207.122.201/evaluation-service/logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + currentToken
            },
            body: JSON.stringify({ stack, level, package: pkg, message })
        });

        if (!resp.ok) {
            console.error('Log send failed, status:', resp.status);
        }
    } catch (err) {
        console.error('Could not reach log server:', err.message);
    }
}

export { Log, setAuthToken };
