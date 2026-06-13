import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateAIObject } from "@/lib/ai/client";
import { phishingEmailSchema } from "@/lib/ai/schemas";
import { checkRateLimit } from "@/lib/ai/rate-limit";

const bodySchema = z.object({
  action: z.enum(["generate", "grade"]),
  redFlags: z.array(z.object({ id: z.string(), text: z.string(), reason: z.string() })).optional(),
  identified: z.array(z.string()).optional(),
});

const SYSTEM_GENERATE = `You are creating an educational phishing email simulation for cybersecurity training.
Create a realistic-looking but FICTIONAL phishing email with 3-5 embedded red flags.
Use fictional company names and domains only. No real URLs. No instructions for actual attacks.
The email should teach users to recognize phishing patterns.
Return JSON: { from: string, subject: string, body: string (plain text, max 200 words), redFlags: [{id, text, reason}] }
Each redFlag.text must appear verbatim somewhere in the body or from/subject fields.`;

const FALLBACK_EMAIL = {
  from: "security@accountservices-paypa1.com",
  subject: "URGENT: Your Account Has Been Suspended",
  body: `Dear Valued Customer,

We have detected suspicious activity on your account. Your account has been temporarily suspended for your protection.

To restore access immediately, please click here: http://verify-account-now.net/restore

You must verify within 24 hours or your account will be permanently deleted.

Best regards,
PayPal Security Team`,
  redFlags: [
    { id: "rf1", text: "security@accountservices-paypa1.com", reason: "Misspelled domain — 'paypa1' uses number '1' instead of letter 'l'" },
    { id: "rf2", text: "URGENT: Your Account Has Been Suspended", reason: "Creates panic with urgent/threatening language" },
    { id: "rf3", text: "Dear Valued Customer", reason: "Generic greeting — legitimate companies use your real name" },
    { id: "rf4", text: "http://verify-account-now.net/restore", reason: "Suspicious link to unknown domain, not the official company website" },
    { id: "rf5", text: "You must verify within 24 hours or your account will be permanently deleted.", reason: "Artificial deadline creates panic and pressure to act without thinking" },
  ],
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(user.id, "phishing-sim");
  if (!allowed) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { action, redFlags, identified } = parsed.data;

  if (action === "generate") {
    try {
      const email = await generateAIObject(
        "Generate a realistic phishing email simulation for cybersecurity awareness training.",
        SYSTEM_GENERATE,
        phishingEmailSchema
      );
      return NextResponse.json({ email });
    } catch {
      return NextResponse.json({ email: FALLBACK_EMAIL });
    }
  }

  if (action === "grade" && redFlags && identified) {
    const total = redFlags.length;
    const correct = identified.filter((id) => redFlags.some((rf) => rf.id === id)).length;
    const missed = redFlags.filter((rf) => !identified.includes(rf.id)).map((rf) => rf.reason);
    const score = Math.round((correct / total) * 100);

    let feedback = "";
    if (score === 100) {
      feedback = "Excellent! You identified every red flag. You're developing a sharp eye for phishing attacks!";
    } else if (score >= 60) {
      feedback = `Good work! You caught ${correct} of ${total} red flags. The ones you missed are key patterns to watch for.`;
    } else {
      feedback = `You caught ${correct} of ${total} red flags. Phishing emails use subtle tricks — review the missed flags and watch for these patterns.`;
    }

    return NextResponse.json({ score, correct, total, feedback, missed });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
