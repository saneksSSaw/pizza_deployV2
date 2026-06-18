const { execSync } = require('child_process');
const port = process.env.PORT || 3000;

try {
  const out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
  const pids = new Set();
  out.split('\n').forEach(line => {
    if (!line.includes('LISTENING')) return;
    const pid = line.trim().split(/\s+/).pop();
    if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
  });
  pids.forEach(pid => {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      console.log(`  Port ${port}: process ${pid} stopped`);
    } catch {}
  });
} catch {}
