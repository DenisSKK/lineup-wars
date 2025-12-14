import Link from 'next/link'
import InvitationBadge from './InvitationBadge'

type ActiveTab = 'festivals' | 'groups' | null

interface HeaderNavProps {
  active?: ActiveTab
}

export default function HeaderNav({ active = null }: HeaderNavProps) {
  return (
    <header className="bg-white shadow">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-purple-600">
            🎸 Lineup Wars
          </Link>
          <nav className="flex gap-4 items-center">
            <Link
              href="/festivals"
              className={active === 'festivals' ? 'text-purple-600 font-semibold' : 'text-gray-600 hover:text-purple-600'}
            >
              Festivals
            </Link>
            <Link
              href="/groups"
              className={active === 'groups' ? 'text-purple-600 font-semibold' : 'text-gray-600 hover:text-purple-600'}
            >
              Groups
            </Link>
            <InvitationBadge />
          </nav>
        </div>
      </div>
    </header>
  )
}
