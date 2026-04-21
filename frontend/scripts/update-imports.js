const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

const replacements = [
  { from: /@\/app\/sections\//g, to: '@/components/sections/' },
  { from: /@\/app\/_components\/landing\//g, to: '@/components/landing/' },
  { from: /@\/components\/public\/PublicFooter/g, to: '@/components/layout/PublicFooter' },
  { from: /@\/components\/public\/PublicHeader/g, to: '@/components/layout/PublicHeader' },
  { from: /@\/components\/public\//g, to: '@/components/landing/' },
  { from: /@\/components\/PublicHeader/g, to: '@/components/layout/PublicHeader' },
  { from: /@\/components\/MobileNavDrawer/g, to: '@/components/layout/MobileNavDrawer' },
  { from: /@\/components\/ThemeToggle/g, to: '@/components/layout/ThemeToggle' },
  { from: /@\/components\/ProfileDropdown/g, to: '@/components/layout/ProfileDropdown' },
  { from: /@\/components\/AdminMfaQr/g, to: '@/components/admin/AdminMfaQr' },
  { from: /@\/components\/AdminNotaAdministrativaSticker/g, to: '@/components/admin/AdminNotaAdministrativaSticker' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      
      for (const rep of replacements) {
        content = content.replace(rep.from, rep.to);
      }
      
      // Also handle relative imports if any exist that broke
      content = content.replace(/\.\/sections\//g, '@/components/sections/');
      
      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
