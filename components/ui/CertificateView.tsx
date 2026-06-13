"use client";
import { ShieldCheck, Award, Printer } from "lucide-react";

interface CertificateViewProps {
  displayName: string;
  certId: string;
  issuedAt: string;
}

export function CertificateView({ displayName, certId, issuedAt }: CertificateViewProps) {
  const date = new Date(issuedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const year = new Date(issuedAt).getFullYear();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Certificate card */}
      <div
        id="certificate"
        className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center border-4 border-double border-gray-200"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <ShieldCheck className="text-indigo-600" size={32} />
          <span className="text-2xl font-bold">
            <span className="text-gray-900">Cyber</span>
            <span className="text-red-500">AI</span>
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-6 tracking-tight">
          CERTIFICATE OF<br />COMPLETION
        </h1>

        <p className="text-gray-600 text-base mb-4">This certifies that</p>

        <p className="text-3xl sm:text-4xl font-black text-gray-900 mb-4 font-serif">
          {displayName}
        </p>

        <p className="text-gray-600 mb-3">has successfully completed the esteemed</p>

        <p
          className="text-2xl sm:text-3xl font-black mb-6 tracking-wide"
          style={{ color: "#7c2d12" }}
        >
          CYBERAI TRAINING PROGRAM
        </p>

        <p className="text-gray-600 mb-8">
          on <strong className="text-gray-900">{date}</strong>
        </p>

        <p className="text-gray-500 text-sm mb-4">Presented by the CyberAI Security Team</p>

        <Award size={48} className="mx-auto text-indigo-500 mb-4" />

        <p className="text-gray-500 text-xs">Certificate ID: {certId}</p>
        <p className="text-gray-400 text-xs mt-1">© {year} CyberAI. All rights reserved.</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 no-print">
        <button
          onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Printer size={16} /> Download / Print PDF
        </button>
        <button
          onClick={async () => {
            const text = `I just completed the CyberAI Training Program! Certificate ID: ${certId} 🛡️`;
            if (navigator.share) {
              try { await navigator.share({ title: "CyberAI Certificate", text }); return; } catch {}
            }
            await navigator.clipboard.writeText(text);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors"
        >
          Share Certificate
        </button>
      </div>
    </div>
  );
}
