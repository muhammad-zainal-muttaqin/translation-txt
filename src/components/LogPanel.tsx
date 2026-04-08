import { useApp } from '../contexts/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function LogPanel() {
  const { state } = useApp()
  const logs = state.logs

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Events</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No events logged yet.</p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-xs">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`${
                  log.level === 'error'
                    ? 'text-red-500'
                    : log.level === 'warning'
                    ? 'text-yellow-500'
                    : 'text-muted-foreground'
                }`}
              >
                <span className="text-muted-foreground">[{formatTime(log.timestamp)}]</span>{' '}
                {log.message}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
