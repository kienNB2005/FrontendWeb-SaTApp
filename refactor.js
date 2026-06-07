const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

const filesToUpdate = [
  'AdminAdministrativeClasses.jsx',
  'AdminDashboard.jsx',
  'AdminDepartments.jsx',
  'AdminLecturers.jsx',
  'AdminReport.jsx',
  'AdminRooms.jsx',
  'AdminStudents.jsx',
  'AdminTkb.jsx',
  'Homeroom.jsx',
  'Report.jsx',
  'Sessions.jsx',
  'Tkb.jsx'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(pagesDir, file);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already processed
  if (content.includes('useError')) return;

  // 1. Add import
  content = content.replace(
    /(import .* from .*;\n+)(?!import)/,
    `$1import { useError } from '../contexts/ErrorContext';\n`
  );

  // 2. Inject hook inside default component
  // Regex to find: export default function Something(props) {
  content = content.replace(
    /(export default function \w+\([^)]*\)\s*\{)/,
    `$1\n  const { showError } = useError();\n`
  );

  // 3. Replace console.error(err) with showError
  // We'll replace console.error(..., err); or console.error(err);
  // Actually, let's just append showError(...) after console.error
  content = content.replace(
    /console\.error\(([^)]*?)\);/g,
    (match, p1) => {
      // p1 is the arguments inside console.error
      // we'll try to extract the error variable name if possible, usually the last argument or just 'err' / 'error'
      const args = p1.split(',');
      const lastArg = args[args.length - 1].trim();
      let errVar = "error";
      if (lastArg === "err" || lastArg === "error" || lastArg === "err2") {
        errVar = lastArg;
      } else {
         return match; // If we can't be sure, skip
      }
      return `${match}\n      showError(${errVar}?.response?.data?.message || ${errVar}?.message || "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");`;
    }
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated', file);
});
