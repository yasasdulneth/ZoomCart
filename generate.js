const fs = require('fs');
const { execSync } = require('child_process');

const DAYS = 60;
const FILE_NAME = 'activity_log.txt';

const GITHUB_NAME = "yasasdulneth";
const GITHUB_EMAIL = "yasasdulneth@gmail.com";

// Initialize and configure git
try {
    execSync('git init');
    execSync('git config --local user.name "' + GITHUB_NAME + '"');
    execSync('git config --local user.email "' + GITHUB_EMAIL + '"');
    execSync('git remote add origin https://github.com/yasasdulneth/ZoomCart.git');
} catch (e) {
    console.log("Git already initialized or remote exists");
}

function formatDate(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Generate the initial commit for the actual code (60 days ago)
const initialDate = new Date();
initialDate.setDate(initialDate.getDate() - DAYS);
const initialDateString = formatDate(initialDate);

try {
    console.log("Staging all real project files for the initial commit...");
    execSync('git add .');
    execSync('git commit -m "Initial commit for ZoomCart"', {
        env: {
            ...process.env,
            GIT_AUTHOR_DATE: initialDateString,
            GIT_COMMITTER_DATE: initialDateString,
            GIT_AUTHOR_NAME: GITHUB_NAME,
            GIT_AUTHOR_EMAIL: GITHUB_EMAIL,
            GIT_COMMITTER_NAME: GITHUB_NAME,
            GIT_COMMITTER_EMAIL: GITHUB_EMAIL
        }
    });
    console.log(`Initial commit made on ${initialDateString}`);
} catch (e) {
    console.log("Initial commit might already exist or failed:", e.message);
}

// Generate the dummy commits
console.log("Generating realistic dummy activity...");
for (let i = DAYS - 1; i >= 0; i--) {
    // 80% chance to code on any given day
    if (Math.random() > 0.8) {
        continue; // Skip this day
    }

    const numCommits = Math.floor(Math.random() * 3) + 1; // 1 to 3 commits

    for (let c = 0; c < numCommits; c++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Random time during the day between 9 AM and 10 PM
        date.setHours(9 + Math.floor(Math.random() * 13)); 
        date.setMinutes(Math.floor(Math.random() * 60));
        date.setSeconds(Math.floor(Math.random() * 60));
        
        const dateString = formatDate(date);
        
        fs.appendFileSync(FILE_NAME, `Activity on ${dateString}\n`);
        execSync(`git add ${FILE_NAME}`);
        
        // Randomize the commit message slightly
        const messages = ["chore: update activity log", "docs: update progress", "chore: minor updates", "refactor: clean up log"];
        const msg = messages[Math.floor(Math.random() * messages.length)];

        execSync(`git commit -m "${msg}"`, {
            env: { 
                ...process.env, 
                GIT_AUTHOR_DATE: dateString, 
                GIT_COMMITTER_DATE: dateString,
                GIT_AUTHOR_NAME: GITHUB_NAME,
                GIT_AUTHOR_EMAIL: GITHUB_EMAIL,
                GIT_COMMITTER_NAME: GITHUB_NAME,
                GIT_COMMITTER_EMAIL: GITHUB_EMAIL
            }
        });
    }
}
console.log("Realistic history generated successfully!");
