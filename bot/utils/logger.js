// Custom Logger with colors and timestamps

// ANSI Color Codes
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",

    fg: {
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
    }
};

function getTimestamp() {
    return new Date().toLocaleTimeString('pl-PL', { hour12: false });
}

const Logger = {
    info: (msg) => {
        console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.fg.cyan}ℹ️  INFO${colors.reset}    ${msg}`);
    },
    success: (msg) => {
        console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.fg.green}✅ SUCCESS${colors.reset} ${msg}`);
    },
    warn: (msg) => {
        console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.fg.yellow}⚠️  WARN${colors.reset}    ${msg}`);
    },
    error: (msg, err = '') => {
        console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.fg.red}❌ ERROR${colors.reset}   ${msg}`, err);
    },
    cmd: (msg) => {
        console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.fg.magenta}🤖 CMD${colors.reset}     ${msg}`);
    },
    event: (msg) => {
        console.log(`${colors.dim}[${getTimestamp()}]${colors.reset} ${colors.fg.blue}🔔 EVENT${colors.reset}   ${msg}`);
    }
};

module.exports = Logger;
