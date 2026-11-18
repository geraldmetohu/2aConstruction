import type { Metadata } from "next";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { BackupDownloader } from "./BackupDownloader";

export const metadata: Metadata = { title: "Database backup" };
export const dynamic = "force-dynamic";

export default async function BackupPage() {
  await requireCatalogueAdmin();
  const keySet = (process.env.BACKUP_SECRET?.trim().length ?? 0) >= 24;
  return (
    <div className="space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-black">Database backup</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">Keep your own copy of everything – quotes, jobs, clients, money, team – on your computer. This only reads the database; nothing is changed. (DigitalOcean also keeps its own daily backups.)</p>
      </header>
      <div className="grid gap-5 xl:grid-cols-2">
        <BackupDownloader />
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-bold">Every week, automatically (Windows PC)</h2>
          <p className="mt-1 text-sm text-neutral-600">A small script on the office PC saves a backup every Sunday at 19:00 – or the next time the PC is switched on – into a folder you choose, keeping the latest 12.</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
            <li>In Vercel → Settings → Environment Variables, add <code className="rounded bg-neutral-100 px-1">BACKUP_SECRET</code> with a long random value (at least 24 characters), then redeploy. {keySet ? <span className="font-semibold text-emerald-700">✓ It&apos;s set.</span> : <span className="font-semibold text-amber-700">Not set yet.</span>}</li>
            <li><a href="/tools/2a-backup.ps1" download className="font-semibold text-amber-700 underline">Download the backup script</a> and save it, e.g. in Documents.</li>
            <li>Open <strong>Windows PowerShell</strong> in that folder and run:<pre className="mt-1 overflow-x-auto rounded-lg bg-neutral-950 p-2 text-xs text-neutral-100">powershell -ExecutionPolicy Bypass -File .\2a-backup.ps1 -Install</pre>It asks for the key from step 1 and where to save backups, sets up the weekly run and makes the first backup straight away.</li>
            <li>To stop it later: <code className="rounded bg-neutral-100 px-1">powershell -ExecutionPolicy Bypass -File .\2a-backup.ps1 -Uninstall</code></li>
          </ol>
          <p className="mt-3 text-xs text-neutral-500">The key is stored encrypted for your Windows user only. Backups contain client names, addresses and money – keep the folder private (and ideally copied to an external drive or cloud folder).</p>
        </section>
      </div>
    </div>
  );
}
