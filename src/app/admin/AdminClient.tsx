'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadFloor, restoreSnapshot, listSnapshots } from '@/app/actions/floor'
import type { UploadResult, Snapshot } from '@/app/actions/floor'
import { Button } from '@/components/ui/button'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Upload, RotateCcw, AlertTriangle } from 'lucide-react'

interface Props {
  initialSnapshots: Snapshot[]
}

export function AdminClient({ initialSnapshots }: Props) {
  const fileRef                        = useRef<HTMLInputElement>(null)
  const [snapshots, setSnapshots]      = useState<Snapshot[]>(initialSnapshots)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError]  = useState<string | null>(null)
  const [confirmId, setConfirmId]      = useState<string | null>(null)  // snapshot pending restore
  const [restoreMsg, setRestoreMsg]    = useState<string | null>(null)
  const [isPending, startTransition]   = useTransition()

  async function refreshSnapshots() {
    const fresh = await listSnapshots()
    setSnapshots(fresh)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadResult(null)
    setUploadError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const svgContent = ev.target?.result as string
      startTransition(async () => {
        try {
          const result = await uploadFloor(svgContent)
          setUploadResult(result)
          await refreshSnapshots()
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : 'Upload failed')
        } finally {
          // Reset file input so the same file can be re-selected
          if (fileRef.current) fileRef.current.value = ''
        }
      })
    }
    reader.readAsText(file)
  }

  function handleRestoreClick(snapshotId: string) {
    setConfirmId(snapshotId)
    setRestoreMsg(null)
  }

  function handleRestoreConfirm() {
    if (!confirmId) return
    startTransition(async () => {
      try {
        await restoreSnapshot(confirmId)
        setRestoreMsg('Restored successfully. Refresh the map to see changes.')
        await refreshSnapshots()
      } catch (err) {
        setRestoreMsg(err instanceof Error ? err.message : 'Restore failed')
      } finally {
        setConfirmId(null)
      }
    })
  }

  return (
    <div className="flex flex-col gap-8">

      {/* ── Upload section ── */}
      <Card>
        <CardHeader>
          <CardTitle>Upload new floor plan</CardTitle>
          <CardDescription>
            Existing seat assignments are preserved. New seats in the SVG are added as Available.
            A snapshot of the current state is saved automatically before any changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input
            ref={fileRef}
            type="file"
            accept=".svg"
            className="hidden"
            onChange={handleFileChange}
            disabled={isPending}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
            className="w-fit"
          >
            <Upload className="size-4 mr-2" />
            {isPending ? 'Uploading…' : 'Choose SVG file'}
          </Button>

          {uploadError && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadResult && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm flex flex-col gap-2">
              <p className="font-medium">Upload complete</p>
              <div className="flex gap-4 text-muted-foreground">
                <span><strong className="text-foreground">{uploadResult.kept}</strong> seats preserved</span>
                <span><strong className="text-foreground">+{uploadResult.added}</strong> added</span>
                <span><strong className="text-foreground">{uploadResult.removed.length}</strong> removed from SVG</span>
              </div>
              {uploadResult.removed.length > 0 && (
                <div className="mt-1">
                  <p className="text-muted-foreground text-xs mb-1">
                    These seats are no longer in the new SVG (still in database — delete manually if needed):
                  </p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {uploadResult.removed.join(', ')}
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Snapshot saved (id: <span className="font-mono">{uploadResult.snapshotId}</span>)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Snapshot history ── */}
      <Card>
        <CardHeader>
          <CardTitle>Version history</CardTitle>
          <CardDescription>
            Every upload saves a snapshot. Restoring a snapshot rolls back both the SVG
            and all seat data to that point in time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No snapshots yet. Upload a new floor plan to create the first one.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {snapshots.map(snap => (
                <div key={snap.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {new Date(snap.created_at).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {snap.seat_count} seats · id: <span className="font-mono">{snap.id.slice(0, 8)}…</span>
                    </span>
                  </div>

                  {confirmId === snap.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Restore this version?</span>
                      <Button size="sm" variant="destructive" disabled={isPending} onClick={handleRestoreConfirm}>
                        {isPending ? 'Restoring…' : 'Yes, restore'}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setConfirmId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => handleRestoreClick(snap.id)}
                    >
                      <RotateCcw className="size-3.5 mr-1.5" />
                      Restore
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {restoreMsg && (
            <p className="mt-4 text-sm text-muted-foreground border-t pt-4">{restoreMsg}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
