import { useState } from "react";
import { Trophy, BookOpen, GitPullRequest, CircleDot, GitCommit, Users, ScanEye, FlaskConical } from "lucide-react";
import { useSnapshot } from "@/hooks/useSnapshot";
import { Loading, ErrorState } from "@/components/shared/States";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PersonAvatar } from "@/components/shared/PersonAvatar";
import type { Contributor } from "@/lib/types";

const MEDAL = ["#D4AF37", "#A8A29E", "#B45309"];

type Metric = "score" | "researchScore" | "reviewScore";
const METRICS: { key: Metric; label: string; icon: typeof Trophy; unit: string; blurb: string }[] = [
  { key: "score", label: "Overall", icon: Trophy, unit: "pts", blurb: "Research and review combined." },
  { key: "researchScore", label: "Researchers", icon: FlaskConical, unit: "research pts", blurb: "Findings authored, PRs merged, issues claimed, commits." },
  { key: "reviewScore", label: "Reviewers", icon: ScanEye, unit: "review pts", blurb: "Adversarial reviews given on others' PRs — the work that keeps the queue moving." },
];

function Podium({ board, metric, unit }: { board: Contributor[]; metric: Metric; unit: string }) {
  const top3 = board.slice(0, 3);
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-3">
      {top3.map((c, i) => (
        <a key={c.login} href={c.url} target="_blank" rel="noreferrer" className={i === 0 ? "sm:order-2" : i === 1 ? "sm:order-1" : "sm:order-3"}>
          <Card className="relative overflow-hidden p-6 text-center transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: `${MEDAL[i]}66` }}>
            <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: MEDAL[i] }} />
            <div className="mx-auto flex flex-col items-center">
              <div className="relative">
                <PersonAvatar login={c.login} avatar={c.avatar} size={i === 0 ? 72 : 60} />
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: MEDAL[i] }}>{i + 1}</div>
              </div>
              <div className="mt-3 font-serif text-lg font-semibold">@{c.login}</div>
              <div className="text-3xl font-bold tabular-nums brand-gradient-text">{(c as any)[metric]}</div>
              <div className="text-xs text-muted-foreground">{unit}</div>
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                {c.findingsAuthored > 0 ? <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" />{c.findingsAuthored}</span> : null}
                {c.reviewsGiven > 0 ? <span className="inline-flex items-center gap-1"><ScanEye className="h-3 w-3" />{c.reviewsGiven}</span> : null}
                {c.prsMerged > 0 ? <span className="inline-flex items-center gap-1"><GitPullRequest className="h-3 w-3" />{c.prsMerged}</span> : null}
              </div>
            </div>
          </Card>
        </a>
      ))}
    </div>
  );
}

export default function Leaderboard() {
  const { data, error, loading } = useSnapshot();
  const [metric, setMetric] = useState<Metric>("score");
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error || "No data"} />;

  return (
    <div>
      <PageHeader title="Contributors">
        Two ways to climb: <strong>research</strong> the problems, or <strong>review</strong> others' work. Both earn credit — reviewing is how the queue stays honest and moving.
      </PageHeader>

      {data.leaderboard.length === 0 ? (
        <EmptyState icon={Users} title="No contributors yet">Be the first — claim an issue on the board and open a PR.</EmptyState>
      ) : (
        <Tabs value={metric === "score" ? "overall" : metric === "researchScore" ? "research" : "review"}
          onValueChange={(v) => setMetric(v === "overall" ? "score" : v === "research" ? "researchScore" : "reviewScore")}>
          <TabsList>
            <TabsTrigger value="overall"><Trophy className="mr-1.5 h-4 w-4" />Overall</TabsTrigger>
            <TabsTrigger value="research"><FlaskConical className="mr-1.5 h-4 w-4" />Researchers</TabsTrigger>
            <TabsTrigger value="review"><ScanEye className="mr-1.5 h-4 w-4" />Reviewers</TabsTrigger>
          </TabsList>

          {METRICS.map((m) => {
            const board = [...data.leaderboard].filter((c) => (c as any)[m.key] > 0).sort((a, b) => (b as any)[m.key] - (a as any)[m.key]);
            const rest = board.slice(3);
            const tabVal = m.key === "score" ? "overall" : m.key === "researchScore" ? "research" : "review";
            return (
              <TabsContent key={m.key} value={tabVal}>
                <p className="mb-5 text-sm text-muted-foreground">{m.blurb}</p>
                {board.length === 0 ? (
                  <EmptyState icon={m.icon} title={`No ${m.label.toLowerCase()} yet`}>
                    {m.key === "reviewScore" ? "Run review_work.sh on a PR you didn't author to be the first reviewer." : "Claim an issue and open a PR to get on the board."}
                  </EmptyState>
                ) : (
                  <>
                    <Podium board={board} metric={m.key} unit={m.unit} />
                    {rest.length > 0 ? (
                      <Card>
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Contributor</TableHead>
                                <TableHead className="text-center"><BookOpen className="mx-auto h-4 w-4" /></TableHead>
                                <TableHead className="text-center"><ScanEye className="mx-auto h-4 w-4" /></TableHead>
                                <TableHead className="text-center"><GitPullRequest className="mx-auto h-4 w-4" /></TableHead>
                                <TableHead className="text-center"><CircleDot className="mx-auto h-4 w-4" /></TableHead>
                                <TableHead className="text-right">{m.label === "Overall" ? "Total" : m.label === "Researchers" ? "Research" : "Review"}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rest.map((c, i) => (
                                <TableRow key={c.login}>
                                  <TableCell className="text-muted-foreground">{i + 4}</TableCell>
                                  <TableCell>
                                    <a href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 font-medium hover:text-brand-cyan-dark">
                                      <PersonAvatar login={c.login} avatar={c.avatar} size={28} /> @{c.login}
                                    </a>
                                  </TableCell>
                                  <TableCell className="text-center tabular-nums text-muted-foreground">{c.findingsAuthored || "–"}</TableCell>
                                  <TableCell className="text-center tabular-nums text-muted-foreground">{c.reviewsGiven || "–"}</TableCell>
                                  <TableCell className="text-center tabular-nums text-muted-foreground">{c.prsMerged || "–"}</TableCell>
                                  <TableCell className="text-center tabular-nums text-muted-foreground">{c.issuesAssigned || "–"}</TableCell>
                                  <TableCell className="text-right font-semibold tabular-nums">{(c as any)[m.key]}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ) : null}
                  </>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Trophy className="h-3.5 w-3.5" /> Legend: <BookOpen className="h-3.5 w-3.5" /> findings · <ScanEye className="h-3.5 w-3.5" /> reviews given · <GitPullRequest className="h-3.5 w-3.5" /> PRs merged · <CircleDot className="h-3.5 w-3.5" /> issues claimed · <GitCommit className="h-3.5 w-3.5" /> commits
      </p>
    </div>
  );
}
