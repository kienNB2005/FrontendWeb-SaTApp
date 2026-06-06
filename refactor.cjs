const fs = require('fs');
const path = require('path');
const dir = 'd:/My_Web/FrontEndWeb/src/pages/';
const files = [
  'AdminAdministrativeClasses.jsx', 'AdminDepartments.jsx', 'AdminFaculties.jsx',
  'AdminLecturers.jsx', 'AdminReport.jsx', 'AdminRequests.jsx',
  'AdminRooms.jsx', 'AdminSemesters.jsx', 'AdminSubjects.jsx', 'AdminTkb.jsx'
];

files.forEach(f => {
  const filePath = path.join(dir, f);
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf-8');
  
  const theadMatch = code.match(/<thead>([\s\S]*?)<\/thead>/);
  if (!theadMatch) return;
  
  const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/g;
  let thMatch;
  const labels = [];
  while ((thMatch = thRegex.exec(theadMatch[1])) !== null) {
    let text = thMatch[1].replace(/<[^>]+>/g, '').trim(); 
    labels.push(text);
  }

  code = code.replace(/<table className="tbl">/, '<table className="ast-responsive-table">');
  code = code.replace(/<table className="tbl[^"]*">/, '<table className="ast-responsive-table">');

  const tbodyMatch = code.match(/<tbody>([\s\S]*?)<\/tbody>/);
  if (tbodyMatch) {
    let tbodyHtml = tbodyMatch[1];
    
    const rows = tbodyHtml.split(/<tr/);
    for (let i = 1; i < rows.length; i++) {
      let rowHtml = rows[i];
      let tdIndex = 0;
      
      rowHtml = rowHtml.replace(/<td([^>]*)>/g, (match, p1) => {
        const label = labels[tdIndex] || '';
        tdIndex++;
        if (p1.includes('data-label')) return match;
        return `<td data-label="${label}"${p1}>`;
      });
      
      rows[i] = rowHtml;
    }
    
    const newTbody = rows.join('<tr');
    code = code.replace(tbodyMatch[1], newTbody);
  }
  
  code = code.replace(/\{renderListGuide\(\)\}/g, '');
  code = code.replace(/const renderListGuide = \(\) => \([\s\S]*?\n  \);/g, '');

  fs.writeFileSync(filePath, code);
  console.log('Processed', f);
});
