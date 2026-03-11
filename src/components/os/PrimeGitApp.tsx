import { useState, useEffect, useCallback } from 'react';
import { GitBranch, GitCommit, GitPullRequest, AlertCircle, ExternalLink, Loader2, Link2, Unlink, RefreshCw, Plus, MessageSquare, FolderGit2, Eye, ChevronRight, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { eventBus } from '@/hooks/useEventBus';

interface Installation {
  id: string;
  installation_id: number;
  account_login: string;
  account_type: string;
  created_at: string;
}

interface Repo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  default_branch: string;
  updated_at: string;
  html_url: string;
  open_issues_count: number;
  stargazers_count: number;
}

interface Issue {
  id: number;
  number: number;
  title: string;
  state: string;
  user: { login: string };
  created_at: string;
  labels: { name: string; color: string }[];
}

interface PR {
  id: number;
  number: number;
  title: string;
  state: string;
  user: { login: string };
  created_at: string;
  head: { ref: string };
  base: { ref: string };
  draft: boolean;
}

interface Commit {
  sha: string;
  commit: { message: string; author: { name: string; date: string } };
}

type View = 'repos' | 'repo-detail' | 'issues' | 'prs' | 'commits' | 'connect';

const GITHUB_APP_SLUG = 'primeos-dev';

export default function PrimeGitApp() {
  const [view, setView] = useState<View>('connect');
  const [installation, setInstallation] = useState<Installation | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Data
  const [repos, setRepos] = useState<Repo[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [prs, setPrs] = useState<PR[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);

  // New issue form
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueBody, setNewIssueBody] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Check for existing GitHub installation
  useEffect(() => {
    const checkInstallation = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setView('connect'); setLoading(false); return; }
      setAccessToken(session.access_token);

      const { data, error } = await supabase
        .from('github_installations' as any)
        .select('*')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setInstallation(data as unknown as Installation);
        setView('repos');
      } else {
        setView('connect');
      }
      setLoading(false);
    };
    checkInstallation();
  }, []);

  // Load repos when installation exists
  useEffect(() => {
    if (!installation) return;
    loadRepos();
  }, [installation]);

  const callGitHub = useCallback(async (action: string, params: Record<string, string> = {}, body?: Record<string, unknown>) => {
    const queryParams = new URLSearchParams({ action, ...params });
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-app?${queryParams.toString()}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: body ? JSON.stringify(body) : undefined,
      }
    );
    return resp.json();
  }, []);

  const loadRepos = useCallback(async () => {
    setActionLoading(true);
    try {
      const data = await callGitHub('list-repos');
      if (data.repositories) {
        setRepos(data.repositories);
      } else if (Array.isArray(data)) {
        setRepos(data);
      }
    } catch (e) {
      console.error('Failed to load repos:', e);
    }
    setActionLoading(false);
  }, [callGitHub]);

  const loadRepoDetail = useCallback(async (repo: Repo) => {
    setSelectedRepo(repo);
    setView('repo-detail');
    setActionLoading(true);
    const [owner, name] = repo.full_name.split('/');
    try {
      const [issueData, prData, commitData] = await Promise.all([
        callGitHub('list-issues', { owner, repo: name }),
        callGitHub('list-prs', { owner, repo: name }),
        callGitHub('list-commits', { owner, repo: name }),
      ]);
      setIssues(Array.isArray(issueData) ? issueData : []);
      setPrs(Array.isArray(prData) ? prData : []);
      setCommits(Array.isArray(commitData) ? commitData : []);
    } catch (e) {
      console.error('Failed to load repo detail:', e);
    }
    setActionLoading(false);
  }, [callGitHub]);

  const createIssue = useCallback(async () => {
    if (!selectedRepo || !newIssueTitle.trim()) return;
    setActionLoading(true);
    const [owner, name] = selectedRepo.full_name.split('/');
    try {
      await callGitHub('create-issue', { owner, repo: name }, {
        title: newIssueTitle,
        body: newIssueBody,
      });
      setNewIssueTitle('');
      setNewIssueBody('');
      setShowNewIssue(false);
      // Reload issues
      const data = await callGitHub('list-issues', { owner, repo: name });
      setIssues(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to create issue:', e);
    }
    setActionLoading(false);
  }, [selectedRepo, newIssueTitle, newIssueBody, callGitHub]);

  const disconnectGitHub = useCallback(async () => {
    if (!installation) return;
    await supabase
      .from('github_installations' as any)
      .delete()
      .eq('id', installation.id);
    setInstallation(null);
    setRepos([]);
    setView('connect');
  }, [installation]);

  const timeAgo = (date: string) => {
    const d = Date.now() - new Date(date).getTime();
    if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
    if (d < 86400000) return `${Math.floor(d / 3600000)}h ago`;
    return `${Math.floor(d / 86400000)}d ago`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 size={20} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <FolderGit2 size={14} className="text-primary" />
          <span className="font-display text-[10px] tracking-wider uppercase text-primary">PrimeGit</span>
          {installation && (
            <span className="text-[9px] text-muted-foreground ml-2">
              @{installation.account_login}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {installation && (
            <>
              <button
                onClick={() => { setView('repos'); loadRepos(); }}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                title="Refresh"
              >
                <RefreshCw size={12} />
              </button>
              <button
                onClick={disconnectGitHub}
                className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
                title="Disconnect GitHub"
              >
                <Unlink size={12} />
              </button>
            </>
          )}
          {actionLoading && <Loader2 size={10} className="animate-spin text-primary ml-1" />}
        </div>
      </div>

      {/* Breadcrumb */}
      {installation && view !== 'connect' && (
        <div className="flex items-center gap-1 px-3 py-1.5 text-[9px] text-muted-foreground border-b border-border/50">
          <button onClick={() => setView('repos')} className="hover:text-foreground">Repos</button>
          {selectedRepo && view !== 'repos' && (
            <>
              <ChevronRight size={8} />
              <button onClick={() => loadRepoDetail(selectedRepo)} className="hover:text-foreground">
                {selectedRepo.name}
              </button>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {/* Connect View */}
        {view === 'connect' && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <FolderGit2 size={40} className="text-muted-foreground" />
            <div className="text-center">
              <p className="text-xs font-display tracking-wider mb-1">Connect GitHub</p>
              <p className="text-[10px] text-muted-foreground max-w-[240px]">
                Install the PrimeOS GitHub App to access your repositories, issues, and pull requests.
              </p>
            </div>
            <a
              href={`https://github.com/apps/${GITHUB_APP_SLUG}/installations/new${accessToken ? `?state=${accessToken}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground text-[10px] font-display tracking-wider hover:bg-primary/90 transition-colors"
            >
              <Link2 size={12} />
              Install GitHub App
              <ExternalLink size={10} />
            </a>
            <p className="text-[9px] text-muted-foreground max-w-[280px] text-center">
              After installing, return here and refresh to see your repos.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-[10px] text-primary hover:underline"
            >
              I've installed it — refresh
            </button>
          </div>
        )}

        {/* Repos List */}
        {view === 'repos' && (
          <div className="space-y-1.5">
            {repos.length === 0 && !actionLoading && (
              <p className="text-[10px] text-muted-foreground text-center py-8">
                No repositories found. Make sure the GitHub App has access to your repos.
              </p>
            )}
            {repos.map(repo => (
              <button
                key={repo.id}
                onClick={() => loadRepoDetail(repo)}
                className="w-full text-left p-2.5 rounded border border-border hover:border-primary/50 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderGit2 size={12} className="text-primary" />
                    <span className="text-[11px] font-medium">{repo.name}</span>
                    {repo.private && (
                      <span className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground">private</span>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground">{timeAgo(repo.updated_at)}</span>
                </div>
                {repo.description && (
                  <p className="text-[9px] text-muted-foreground mt-1 line-clamp-1">{repo.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-[9px] text-muted-foreground">
                  {repo.language && <span>{repo.language}</span>}
                  <span className="flex items-center gap-0.5"><AlertCircle size={8} /> {repo.open_issues_count}</span>
                  <span>{repo.default_branch}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Repo Detail */}
        {view === 'repo-detail' && selectedRepo && (
          <div className="space-y-4">
            {/* Repo header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-display tracking-wider">{selectedRepo.full_name}</h3>
                {selectedRepo.description && (
                  <p className="text-[9px] text-muted-foreground mt-0.5">{selectedRepo.description}</p>
                )}
              </div>
              <a
                href={selectedRepo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Tabs */}
            <div className="flex gap-3 border-b border-border pb-1">
              {[
                { key: 'issues', icon: AlertCircle, label: `Issues (${issues.length})` },
                { key: 'prs', icon: GitPullRequest, label: `PRs (${prs.length})` },
                { key: 'commits', icon: GitCommit, label: `Commits (${commits.length})` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setView(tab.key as View)}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground pb-1"
                >
                  <tab.icon size={10} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Issues */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-[10px] tracking-wider uppercase text-muted-foreground">Issues</span>
                <button
                  onClick={() => setShowNewIssue(!showNewIssue)}
                  className="flex items-center gap-1 text-[9px] text-primary hover:underline"
                >
                  <Plus size={10} /> New Issue
                </button>
              </div>

              {showNewIssue && (
                <div className="p-2 rounded border border-primary/30 bg-primary/5 space-y-2">
                  <input
                    value={newIssueTitle}
                    onChange={e => setNewIssueTitle(e.target.value)}
                    placeholder="Issue title"
                    className="w-full bg-background border border-border rounded px-2 py-1 text-[10px]"
                  />
                  <textarea
                    value={newIssueBody}
                    onChange={e => setNewIssueBody(e.target.value)}
                    placeholder="Description (optional)"
                    rows={3}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-[10px] resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createIssue}
                      disabled={!newIssueTitle.trim() || actionLoading}
                      className="px-2 py-1 rounded bg-primary text-primary-foreground text-[9px] disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 size={10} className="animate-spin" /> : 'Create'}
                    </button>
                    <button
                      onClick={() => setShowNewIssue(false)}
                      className="px-2 py-1 rounded border border-border text-[9px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {issues.map(issue => (
                <div key={issue.id} className="flex items-start gap-2 p-2 rounded border border-border hover:bg-accent/30">
                  <AlertCircle size={10} className={issue.state === 'open' ? 'text-green-400 mt-0.5' : 'text-muted-foreground mt-0.5'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium truncate">#{issue.number} {issue.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[8px] text-muted-foreground">
                      <span>{issue.user.login}</span>
                      <span>{timeAgo(issue.created_at)}</span>
                      {issue.labels.map(l => (
                        <span key={l.name} className="px-1 rounded" style={{ backgroundColor: `#${l.color}20`, color: `#${l.color}` }}>
                          {l.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {issues.length === 0 && <p className="text-[9px] text-muted-foreground">No open issues</p>}
            </div>

            {/* Pull Requests */}
            <div className="space-y-2">
              <span className="font-display text-[10px] tracking-wider uppercase text-muted-foreground">Pull Requests</span>
              {prs.map(pr => (
                <div key={pr.id} className="flex items-start gap-2 p-2 rounded border border-border hover:bg-accent/30">
                  <GitPullRequest size={10} className={pr.state === 'open' ? 'text-green-400 mt-0.5' : 'text-purple-400 mt-0.5'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium truncate">
                      #{pr.number} {pr.title}
                      {pr.draft && <span className="text-[8px] ml-1 text-muted-foreground">(draft)</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[8px] text-muted-foreground">
                      <span>{pr.user.login}</span>
                      <span>{pr.head.ref} → {pr.base.ref}</span>
                      <span>{timeAgo(pr.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {prs.length === 0 && <p className="text-[9px] text-muted-foreground">No open pull requests</p>}
            </div>

            {/* Commits */}
            <div className="space-y-2">
              <span className="font-display text-[10px] tracking-wider uppercase text-muted-foreground">Recent Commits</span>
              {commits.slice(0, 15).map(c => (
                <div key={c.sha} className="flex items-start gap-2 p-2 rounded border border-border hover:bg-accent/30">
                  <GitCommit size={10} className="text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] truncate">{c.commit.message.split('\n')[0]}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[8px] text-muted-foreground">
                      <span>{c.commit.author.name}</span>
                      <span>{timeAgo(c.commit.author.date)}</span>
                      <span className="font-mono">{c.sha.slice(0, 7)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {commits.length === 0 && <p className="text-[9px] text-muted-foreground">No commits loaded</p>}
            </div>
          </div>
        )}

        {/* Issues View (full) */}
        {view === 'issues' && selectedRepo && (
          <div className="space-y-2">
            <button onClick={() => setView('repo-detail')} className="text-[9px] text-primary hover:underline mb-2">
              ← Back to overview
            </button>
            {issues.map(issue => (
              <div key={issue.id} className="flex items-start gap-2 p-2 rounded border border-border">
                <AlertCircle size={10} className={issue.state === 'open' ? 'text-green-400 mt-0.5' : 'text-muted-foreground mt-0.5'} />
                <div className="flex-1">
                  <p className="text-[10px] font-medium">#{issue.number} {issue.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[8px] text-muted-foreground">
                    <span>{issue.user.login}</span>
                    <span>{timeAgo(issue.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PRs View (full) */}
        {view === 'prs' && selectedRepo && (
          <div className="space-y-2">
            <button onClick={() => setView('repo-detail')} className="text-[9px] text-primary hover:underline mb-2">
              ← Back to overview
            </button>
            {prs.map(pr => (
              <div key={pr.id} className="flex items-start gap-2 p-2 rounded border border-border">
                <GitPullRequest size={10} className={pr.state === 'open' ? 'text-green-400 mt-0.5' : 'text-purple-400 mt-0.5'} />
                <div className="flex-1">
                  <p className="text-[10px] font-medium">#{pr.number} {pr.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[8px] text-muted-foreground">
                    <span>{pr.head.ref} → {pr.base.ref}</span>
                    <span>{pr.user.login}</span>
                    <span>{timeAgo(pr.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Commits View (full) */}
        {view === 'commits' && selectedRepo && (
          <div className="space-y-2">
            <button onClick={() => setView('repo-detail')} className="text-[9px] text-primary hover:underline mb-2">
              ← Back to overview
            </button>
            {commits.map(c => (
              <div key={c.sha} className="flex items-start gap-2 p-2 rounded border border-border">
                <GitCommit size={10} className="text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-[10px]">{c.commit.message.split('\n')[0]}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[8px] text-muted-foreground">
                    <span>{c.commit.author.name}</span>
                    <span>{timeAgo(c.commit.author.date)}</span>
                    <span className="font-mono">{c.sha.slice(0, 7)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
