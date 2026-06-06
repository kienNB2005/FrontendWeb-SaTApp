const fs = require('fs');
const path = require('path');
const dir = 'd:/My_Web/FrontEndWeb/src/pages/';
const files = [
  'Dashboard.jsx', 'Sessions.jsx', 'Attendance.jsx',
  'Report.jsx', 'Homeroom.jsx', 'LecturerRequests.jsx'
];

files.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Wrap <table className="tbl"> with <div className="ast-table-wrap">
  // and replace className="tbl" with className="ast-responsive-table"
  const tableRegex = /<table\s+className="tbl"([^>]*)>/g;
  content = content.replace(tableRegex, '<div className="ast-table-wrap">\n        <table className="ast-responsive-table"$1>');

  // 2. Add closing </div> for the wrapper. We find </table> and replace with </table>\n      </div>
  // But wait! We only want to close the ones we opened.
  // A safer regex replacement for </table>:
  // We can just replace </table> with </table>\n      </div> 
  // BUT only if we actually replaced a table above.
  if (content !== originalContent) {
    // Actually wait, what if there's multiple tables?
    // We can do a string split and process blocks.
  }

  fs.writeFileSync(filePath + '.temp', content);
});
console.log('Done script generation');
