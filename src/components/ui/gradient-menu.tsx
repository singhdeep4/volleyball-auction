import { IoHammerOutline, IoPeopleOutline, IoTrophyOutline, IoBarChartOutline } from 'react-icons/io5';

interface MenuItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
}

const menuItems: MenuItem[] = [
  { id: 'auction', title: 'Auction', icon: <IoHammerOutline />, gradientFrom: '#a955ff', gradientTo: '#ea51ff' },
  { id: 'players', title: 'Players', icon: <IoPeopleOutline />, gradientFrom: '#56CCF2', gradientTo: '#2F80ED' },
  { id: 'teams', title: 'Teams', icon: <IoTrophyOutline />, gradientFrom: '#FF9966', gradientTo: '#FF5E62' },
  { id: 'results', title: 'Results', icon: <IoBarChartOutline />, gradientFrom: '#80FF72', gradientTo: '#7EE8FA' },
];

export default function GradientMenu({ activeTab, onTabChange }: { activeTab: string, onTabChange: (id: string) => void }) {
  return (
    <div className="flex justify-center items-center py-8">
      <ul className="flex gap-6">
        {menuItems.map(({ id, title, icon, gradientFrom, gradientTo }) => (
          <li
            key={id}
            onClick={() => onTabChange(id)}
            style={{ 
              '--gradient-from': gradientFrom, 
              '--gradient-to': gradientTo 
            } as React.CSSProperties}
            className={`relative w-[60px] h-[60px] bg-white/10 backdrop-blur-md border border-white/20 shadow-lg rounded-full flex items-center justify-center transition-all duration-500 hover:w-[180px] hover:shadow-none group cursor-pointer ${activeTab === id ? 'w-[180px]' : ''}`}
          >
            {/* Gradient background on hover/active */}
            <span className={`absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] transition-all duration-500 group-hover:opacity-100 ${activeTab === id ? 'opacity-100' : 'opacity-0'}`}></span>
            {/* Blur glow */}
            <span className={`absolute top-[10px] inset-x-0 h-full rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] blur-[15px] -z-10 transition-all duration-500 group-hover:opacity-50 ${activeTab === id ? 'opacity-50' : 'opacity-0'}`}></span>

            {/* Icon */}
            <span className={`relative z-10 transition-all duration-500 group-hover:scale-0 delay-0 ${activeTab === id ? 'scale-0' : 'scale-100'}`}>
              <span className="text-2xl text-white/80">{icon}</span>
            </span>

            {/* Title */}
            <span className={`absolute text-white uppercase tracking-wide text-sm font-bold transition-all duration-500 group-hover:scale-100 delay-150 ${activeTab === id ? 'scale-100' : 'scale-0'}`}>
              {title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
