import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Coins, 
  Image as ImageIcon, 
  ArrowRightLeft, 
  ShieldCheck, 
  FileCode,
  Link as LinkIcon
} from 'lucide-react';

export default function TransactionIcon({ type, size = 20 }) {
  // Mapa de configuración: Tipo -> { Icono, Color de fondo, Color de texto }
  const config = {
    send: { 
      Icon: ArrowUpRight, 
      bg: 'bg-red-500/10', 
      color: 'text-red-400' 
    },
    receive: { 
      Icon: ArrowDownLeft, 
      bg: 'bg-green-500/10', 
      color: 'text-green-400' 
    },
    token_send: { 
      Icon: Coins, 
      bg: 'bg-purple-500/10', 
      color: 'text-purple-400' 
    },
    token_receive: { 
      Icon: Coins, 
      bg: 'bg-purple-500/10', 
      color: 'text-purple-400' 
    },
    nft: { 
      Icon: ImageIcon, 
      bg: 'bg-cyan-500/10', 
      color: 'text-cyan-400' 
    },
    swap: { 
      Icon: ArrowRightLeft, 
      bg: 'bg-orange-500/10', 
      color: 'text-orange-400' 
    },
    approve: { 
      Icon: ShieldCheck, 
      bg: 'bg-yellow-500/10', 
      color: 'text-yellow-400' 
    },
    bridge: { 
      Icon: LinkIcon, 
      bg: 'bg-blue-500/10', 
      color: 'text-blue-400' 
    },
    contract: { 
      Icon: FileCode, 
      bg: 'bg-gray-500/10', 
      color: 'text-gray-400' 
    },
    unknown: { 
      Icon: FileCode, 
      bg: 'bg-gray-500/10', 
      color: 'text-gray-400' 
    }
  };

  // Si el tipo no existe, usa 'unknown' por defecto
  const { Icon, bg, color } = config[type] || config.unknown;

  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg} ${color} border border-white/5`}>
      <Icon size={size} />
    </div>
  );
        }
