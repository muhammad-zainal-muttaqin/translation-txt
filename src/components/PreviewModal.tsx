import { useApp } from '../contexts/AppContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'
import { Button } from './ui/button'

interface PreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PreviewModal({ open, onOpenChange }: PreviewModalProps) {
  const { state } = useApp()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Full Preview</DialogTitle>
          <DialogDescription>
            View the original and translated text side by side.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid md:grid-cols-2 gap-4 overflow-hidden">
          <div className="flex flex-col overflow-hidden">
            <h3 className="text-sm font-medium mb-2">Original</h3>
            <pre className="flex-1 p-3 bg-muted rounded-md text-xs overflow-auto">
              {state.file?.content || 'Nothing loaded yet.'}
            </pre>
          </div>
          <div className="flex flex-col overflow-hidden">
            <h3 className="text-sm font-medium mb-2">Translated</h3>
            <pre className="flex-1 p-3 bg-muted rounded-md text-xs overflow-auto">
              {state.translationOutput || 'No translation yet.'}
            </pre>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
