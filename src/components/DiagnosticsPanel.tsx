import { useApp } from '../contexts/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react'

export function DiagnosticsPanel() {
  const { state } = useApp()
  const activeRun = state.activeRun
  const chunks = activeRun?.chunks || []

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
      case 'failed-refusal':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'review-required':
      case 'failed-validation':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  if (chunks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chunk Diagnostics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No chunks processed yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chunk Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {chunks.map((chunk, index) => (
          <div key={index} className="border rounded-md p-3 text-sm">
            <div className="flex items-center gap-2">
              {getStatusIcon(chunk.status)}
              <span className="font-medium">Chunk {index + 1}</span>
              <span className="text-muted-foreground ml-auto">{chunk.status}</span>
            </div>
            {chunk.error && (
              <p className="text-destructive mt-1 text-xs">{chunk.error}</p>
            )}
            {chunk.diagnostics && chunk.diagnostics.length > 0 && (
              <div className="mt-2 space-y-1">
                {chunk.diagnostics.map((diag, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    [{diag.type}] {diag.code}: {diag.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
