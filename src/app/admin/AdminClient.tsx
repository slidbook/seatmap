'use client'

import { useRef, useState, useTransition } from 'react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { uploadFloor, restoreSnapshot, listSnapshots } from '@/app/actions/floor'
import type { UploadResult, Snapshot } from '@/app/actions/floor'
import type { AuditLog } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Upload, RotateCcw, AlertTriangle, ArrowUpDown } from 'lucide-react'

// ── Audit log columns ─────────────────────────────────────────────────────────
const ACTION_STYLES: Record<string, string> = {
  ASSIGN:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  UNASSIGN: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  RESERVE:  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  MOVE:     'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  UPDATE:   'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
}

const columns: ColumnDef<AuditLog>[] = [
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <button className="flex items-center gap-1 text-left"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Time <ArrowUpDown className="size-3" />
      </button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground whitespace-nowrap text-xs">
        {new Date(row.getValue('created_at')).toLocaleString('en-SG', {
          dateStyle: 'short', timeStyle: 'short',
        })}
      </span>
    ),
  },
  {
    accessorKey: 'editor_email',
    header: 'Editor',
    cell: ({ row }) => <span className="text-sm">{row.getValue('editor_email')}</span>,
  },
  {
    id: 'seat',
    header: 'Seat',
    accessorFn: (row) => row.seat?.label ?? '',
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.seat?.label ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'action',
    header: 'Action',
    cell: ({ row }) => {
      const action = row.getValue<string>('action')
      return (
        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${ACTION_STYLES[action] ?? 'bg-muted'}`}>
          {action}
        </span>
      )
    },
  },
  {
    id: 'change',
    header: 'Change',
    cell: ({ row }) => {
      const { field, old_value, new_value } = row.original
      if (!field) return null
      return (
        <span className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{field}</span>
          {old_value && <span> {old_value} →</span>}
          {new_value && <span> {new_value}</span>}
        </span>
      )
    },
  },
]

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  initialSnapshots: Snapshot[]
  initialLogs: AuditLog[]
}

export function AdminClient({ initialSnapshots, initialLogs }: Props) {
  const fileRef                         = useRef<HTMLInputElement>(null)
  const [snapshots, setSnapshots]       = useState<Snapshot[]>(initialSnapshots)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [uploadError, setUploadError]   = useState<string | null>(null)
  const [confirmId, setConfirmId]       = useState<string | null>(null)
  const [restoreMsg, setRestoreMsg]     = useState<string | null>(null)
  const [isPending, startTransition]    = useTransition()
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting]           = useState<SortingState>([{ id: 'created_at', desc: true }])

  const table = useReactTable({
    data: initialLogs,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  async function refreshSnapshots() {
    setSnapshots(await listSnapshots())
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
          setUploadResult(await uploadFloor(svgContent))
          await refreshSnapshots()
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : 'Upload failed')
        } finally {
          if (fileRef.current) fileRef.current.value = ''
        }
      })
    }
    reader.readAsText(file)
  }

  function handleRestoreClick(id: string) { setConfirmId(id); setRestoreMsg(null) }

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

      {/* ── Audit log ── */}
      <Card>
        <CardHeader>
          <CardTitle>Audit log</CardTitle>
          <CardDescription>All seat changes, most recent first.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Input
            placeholder="Filter by editor, seat, or action…"
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map(hg => (
                  <TableRow key={hg.id}>
                    {hg.headers.map(h => (
                      <TableHead key={h.id}>
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-10 text-sm">
                      No audit log entries yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {initialLogs.length} entries
          </p>
        </CardContent>
      </Card>

      {/* ── Upload section ── */}
      <Card>
        <CardHeader>
          <CardTitle>Upload new floor plan</CardTitle>
          <CardDescription>
            Existing seat assignments are preserved. New seats are added as Available.
            A snapshot is saved automatically before any changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input ref={fileRef} type="file" accept=".svg" className="hidden"
            onChange={handleFileChange} disabled={isPending} />
          <Button onClick={() => fileRef.current?.click()} disabled={isPending} className="w-fit">
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
                <p className="text-xs font-mono text-muted-foreground">
                  Removed: {uploadResult.removed.join(', ')}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Version history ── */}
      <Card>
        <CardHeader>
          <CardTitle>Version history</CardTitle>
          <CardDescription>
            Every upload saves a snapshot. Restoring rolls back the SVG and all seat data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No snapshots yet.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {snapshots.map(snap => (
                <div key={snap.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {new Date(snap.created_at).toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {snap.seat_count} seats · <span className="font-mono">{snap.id.slice(0, 8)}…</span>
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
                    <Button size="sm" variant="outline" disabled={isPending}
                      onClick={() => handleRestoreClick(snap.id)}>
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
