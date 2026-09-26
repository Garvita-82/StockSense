import type { Metadata } from 'next'
import { WarehouseStaffDashboard } from '@/components/dashboard/warehouse-staff-dashboard'

export const metadata: Metadata = { title: 'Warehouse Operations' }

export default function WarehousePage() {
  return <WarehouseStaffDashboard />
}
