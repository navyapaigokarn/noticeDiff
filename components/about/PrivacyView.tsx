import { brand } from '@/config/brand';

export function PrivacyView() {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-sm leading-7 text-slate-700">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Privacy policy</h1>
      <p>
        {brand.name} {brand.version} stores monitoring data on this device. This policy describes the behaviour of this version of the extension.
      </p>
      <h2 className="text-base font-semibold text-slate-950">What is stored</h2>
      <p>
        When you add a website, {brand.name} stores its address, title, hostname, an optional favicon address, the extracted text, a content hash, check times, and later change summaries. Preferences such as the default frequency and notification toggle are stored with Chrome storage. Nothing in this list is uploaded to a {brand.name} server, because this version has no account system and no backend.
      </p>
      <h2 className="text-base font-semibold text-slate-950">What is accessed</h2>
      <p>
        Clicking Monitor This Page reads the address and title of the active tab. The extension then asks for permission to read that specific website. It does not request access to every website during installation, and it does not collect browsing history, passwords, cookies, or authentication tokens.
      </p>
      <h2 className="text-base font-semibold text-slate-950">What is transmitted</h2>
      <p>
        To check a page, {brand.name} downloads its public HTML directly from that website with credentials omitted. Redirects to localhost, private networks, and local addresses are rejected. Page text is not sent to an analytics service or an external AI service. Desktop notifications are created locally by Chrome.
      </p>
      <h2 className="text-base font-semibold text-slate-950">What you can delete</h2>
      <p>
        You can delete one website and its history, clear older snapshots, or erase all monitoring data from Settings. Removing the extension deletes its local storage as well.
      </p>
      <p>{brand.monitoringLimitation}</p>
    </article>
  );
}
