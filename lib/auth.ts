export type OperationalRole = 'manager' | 'staff'

export const DEMO_ACCOUNTS: Record<OperationalRole, { email: string; password: string; label: string }> = {
  manager: { email: 'manager@stockline.com', password: 'manager123', label: 'Inventory Manager' },
  staff: { email: 'warehouse@stockline.com', password: 'warehouse123', label: 'Warehouse Staff' },
}

export const AUTH_STORAGE_KEY = 'stockline:demo-auth'
export const ROLE_STORAGE_KEY = 'stockline:demo-role'

export function isOperationalRole(value: string | null): value is OperationalRole {
  return value === 'manager' || value === 'staff'
}
