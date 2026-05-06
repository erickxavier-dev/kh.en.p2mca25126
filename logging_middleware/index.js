let currentToken = '';

const setAuthToken = (val) => {
    currentToken = val;
};

const Log = async (stackType, level, pkgName, msg) => {
    // Quick validation checks
    if (stackType !== 'backend' && stackType !== 'frontend') return;
    
    const allowedLevels = new Set(['debug', 'info', 'warn', 'error', 'fatal']);
    if (!allowedLevels.has(level)) return;

    // Check package rules based on the stack
    const shared = ['auth', 'config', 'middleware', 'utils'];
    const bePkgs = ['cache', 'controller', 'cronjob', 'db', 'domain', 'handler', 'repository', 'route', 'service'];
    const fePkgs = ['api', 'component', 'hook', 'page', 'state', 'style'];

    let isValidPkg = false;
    if (shared.includes(pkgName)) {
        isValidPkg = true;
    } else if (stackType === 'backend' && bePkgs.includes(pkgName)) {
        isValidPkg = true;
    } else if (stackType === 'frontend' && fePkgs.includes(pkgName)) {
        isValidPkg = true;
    }

    if (!isValidPkg) return; // Silent drop if rules aren't met

    try {
        const res = await fetch('http://20.207.122.201/evaluation-service/logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                stack: stackType,
                level: level,
                package: pkgName,
                message: msg
            })
        });

        if (!res.ok) {
            console.error('Log failed:', res.status);
        }
    } catch (err) {
        console.error('Failed to connect to logger:', err.message);
    }
};

module.exports = { Log, setAuthToken };
