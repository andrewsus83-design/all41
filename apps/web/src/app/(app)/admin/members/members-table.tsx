"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { grantCredit, setRole } from "./actions";

export type MemberRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: string;
  balance: number;
  joined: string;
};

function Row({ r }: { r: MemberRow }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const isAdmin = r.role === "admin";
  return (
    <tr className="border-t border-line bg-bg-elev align-top">
      <td className="py-3 px-4">
        <div className="font-medium">{r.email}</div>
        {r.name && <div className="text-xs text-fg-faint">{r.name}</div>}
      </td>
      <td className="py-3 px-4">{isAdmin ? <Badge tone="violet">admin</Badge> : <Badge>user</Badge>}</td>
      <td className="py-3 px-4 num text-fg-muted">${r.balance.toFixed(2)}</td>
      <td className="py-3 px-4 num text-xs text-fg-faint">{new Date(r.joined).toLocaleDateString()}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Input className="h-9 w-20 num" placeholder="$" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button size="sm" phase="green" disabled={pending || !Number(amount)} onClick={() => start(async () => { const x = await grantCredit(r.id, Number(amount), "admin grant"); setMsg(x.message); if (x.ok) { setAmount(""); router.refresh(); } })}>Grant</Button>
          <Button size="sm" phase="ghost" disabled={pending} onClick={() => start(async () => { const x = await setRole(r.id, !isAdmin); setMsg(x.message); if (x.ok) router.refresh(); })}>{isAdmin ? "Revoke admin" : "Make admin"}</Button>
        </div>
        {msg && <p className="text-xs text-fg-muted mt-1">{msg}</p>}
      </td>
    </tr>
  );
}

export function MembersTable({ rows }: { rows: MemberRow[] }) {
  return (
    <div className="overflow-x-auto squircle rounded-4 border border-line">
      <table className="w-full text-sm border-collapse">
        <thead className="text-fg-faint text-xs uppercase tracking-wide bg-bg-elev">
          <tr>
            <th className="text-left font-medium py-3 px-4">Member</th>
            <th className="text-left font-medium py-3 px-4">Role</th>
            <th className="text-left font-medium py-3 px-4">Balance</th>
            <th className="text-left font-medium py-3 px-4">Joined</th>
            <th className="text-left font-medium py-3 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>{rows.map((r) => <Row key={r.id} r={r} />)}</tbody>
      </table>
    </div>
  );
}
