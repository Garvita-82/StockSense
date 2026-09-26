import Link from 'next/link'
import { Layers } from 'lucide-react'

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Layers className="size-4" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight">Stockline</span>
        <span className="mt-0.5 text-[11px] text-muted-foreground">Warehouse Operations</span>
      </span>
    </Link>
  )
}
