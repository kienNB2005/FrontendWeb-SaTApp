const fs = require('fs');
const path = require('path');

const replaceRules = [
    { from: /'\/admin\/administrative-classes/g, to: "'/api/v1/administrative-classes" },
    { from: /'\/admin\/departments/g, to: "'/api/v1/departments" },
    { from: /'\/admin\/faculties/g, to: "'/api/v1/faculties" },
    { from: /'\/users\/lecturers/g, to: "'/api/v1/users/lecturers" },
    { from: /'\/users\/lecturer\/template/g, to: "'/api/v1/users/lecturers/template" }, // note plural
    { from: /'\/admin\/rooms/g, to: "'/api/v1/rooms" },
    { from: /'\/admin\/semesters/g, to: "'/api/v1/semesters" },
    { from: /'\/users\/students/g, to: "'/api/v1/users/students" },
    { from: /'\/admin\/subjects/g, to: "'/api/v1/subjects" },
    { from: /'\/admin\/schedules/g, to: "'/api/v1/schedules" },
    { from: /'\/sessions\/list/g, to: "'/api/v1/sessions" },
    { from: /`\/sessions\/\$\{/g, to: "`/api/v1/sessions/${" },
    { from: /'\/sessions\/filter\/admin-classes'/g, to: "'/api/v1/administrative-classes/filter-by-session'" },
    { from: /'\/sessions\/filter\/subjects'/g, to: "'/api/v1/subjects/filter-by-session'" },
    { from: /'\/sessions\/available-rooms'/g, to: "'/api/v1/rooms/available'" },
    { from: /'\/api\/homeroom\/reports/g, to: "'/api/v1/reports/homeroom" },
    { from: /`\/api\/homeroom\/reports/g, to: "`/api/v1/reports/homeroom" },
    { from: /'\/api\/lecturer\/reports/g, to: "'/api/v1/reports/lecturer" },
    { from: /`\/api\/lecturer\/reports/g, to: "`/api/v1/reports/lecturer" },
    { from: /"\/lecturer\/dashboard"/g, to: "\"/api/v1/lecturers/me/dashboard\"" },
];

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            for (const rule of replaceRules) {
                content = content.replace(rule.from, rule.to);
            }
            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated', fullPath);
            }
        }
    }
}

processDir(path.join(__dirname, 'src'));
console.log('Done replacing API paths.');
