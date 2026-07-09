import { useEffect, useRef } from 'react'
import { useApp } from '../contexts/AppContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { AlertCircle, CheckCircle, XCircle, Info, Clock } from 'lucide-react'

function chunkStatusIcon(status: string) {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" />
    case 'failed':
    case 'failed-refusal':
      return <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
    case 'review-required':
    case 'failed-validation':
    case 'truncated':
      return <AlertCircle className="h-4 w-4 text-warning" aria-hidden="true" />
    case 'running':
      return <Clock className="h-4 w-4 text-info animate-pulse" aria-hidden="true" />
    default:
      return <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
  }
}

function formatDuration(startTime: number | null, endTime: number | null) {
  if (!startTime) return '—'
  const duration = endTime ? endTime - startTime : Date.now() - startTime
  return (duration / 1000).toFixed(1) + 's'
}

function formatLogTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString()
}

export function ActivitySection() {
  const { state } = useApp()
  const chunks = state.activeRun?.chunks || []
  const logs = state.logs
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs.length])

  if (!state.activeRun && logs.length === 0) return null

  return (
    <section aria-label="Activity" className="border-t pt-8">
      <details className="group">
        <summary className="cursor-pointer font-serif text-2xl list-none flex items-center gap-2">
          <span
            className="text-sm text-muted-foreground transition-transform group-open:rotate-90"
            aria-hidden="true"
          >
            ▸
          </span>
          Activity &amp; diagnostics
        </summary>

        <div className="mt-4">
          <Tabs defaultValue="details">
            <TabsList>
              <TabsTrigger value="details">Translation details</TabsTrigger>
              <TabsTrigger value="log">Session log</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              {chunks.length === 0 ? (
                <p className="text-muted-foreground text-sm py-2">
                  Details will appear here once translation starts.
                </p>
              ) : (
                <div className="space-y-2">
                  {chunks.map((chunk, index) => (
                    <div key={index} className="border rounded-md p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        {chunkStatusIcon(chunk.status)}
                        <span className="font-medium">Part {index + 1}</span>
                        <span className="text-muted-foreground ml-auto">{chunk.status}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(chunk.startTime, chunk.endTime)}
                        </span>
                      </div>
                      {chunk.error && <p className="text-destructive mt-1 text-xs">{chunk.error}</p>}
                      {chunk.diagnostics && chunk.diagnostics.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {chunk.diagnostics.map((diag, i) => (
                            <p key={i} className="text-xs text-muted-foreground font-mono">
                              [{diag.type}] {diag.code}: {diag.message}
                            </p>
                          ))}
                        </div>
                      )}
                      {chunk.retryCount > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Retries: {chunk.retryCount}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="log">
              {logs.length === 0 ? (
                <p className="text-muted-foreground text-sm py-2">No events logged yet.</p>
              ) : (
                <div
                  ref={logRef}
                  className="space-y-1 max-h-80 overflow-y-auto font-mono text-xs break-all rounded-md border p-3"
                >
                  {logs.map((log, index) => (
                    <div
                      key={index}
                      className={
                        log.level === 'error'
                          ? 'text-destructive'
                          : log.level === 'warning'
                            ? 'text-warning'
                            : 'text-muted-foreground'
                      }
                    >
                      <span className="opacity-70">[{formatLogTime(log.timestamp)}]</span> {log.message}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </details>
    </section>
  )
}
