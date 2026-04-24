import React from 'react';

export const BaseIcon = ({ children, className = '', size = 24 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={`rounded-full border-2 border-white/50 p-0.5 ${className}`}
  >
    {children}
  </svg>
);

export const AntiAircraftIcon = (props) => <BaseIcon {...props}><path d="M5 19h14v2H5v-2zm7-2c-1.1 0-2-.9-2-2 0-.2.1-.4.1-.5L4.4 7.6l1.4-1.4 5.7 6.9c.1 0 .3-.1.5-.1 1.1 0 2 .9 2 2s-.9 2-2 2z" /></BaseIcon>;
export const InfantryIcon = (props) => <BaseIcon {...props}><path d="M12 2C10.9 2 10 2.9 10 4C10 5.1 10.9 6 12 6C13.1 6 14 5.1 14 4C14 2.9 13.1 2 12 2ZM8 7.5V11H7V13H8V22H10.5V15.5H13.5V22H16V13H17V11H16V7.5C16 6.7 15.3 6 14.5 6H9.5C8.7 6 8 6.7 8 7.5Z" /></BaseIcon>;
export const ArtilleryIcon = (props) => <BaseIcon {...props}><path d="M19 14.5L6.5 9.8L5.5 12L18 16.5L19 14.5ZM7 14C5.34 14 4 15.34 4 17C4 18.66 5.34 20 7 20C8.66 20 10 18.66 10 17C10 15.34 8.66 14 7 14ZM7 18.5C6.17 18.5 5.5 17.83 5.5 17C5.5 16.17 6.17 15.5 7 15.5C7.83 15.5 8.5 16.17 8.5 17C8.5 17.83 7.83 18.5 7 18.5Z" /></BaseIcon>;
export const TankIcon = (props) => <BaseIcon {...props}><path d="M21 11H16V9C16 7.9 15.1 7 14 7H8C6.9 7 6 7.9 6 9V11H3C1.9 11 1 11.9 1 13V15C1 16.1 1.9 17 3 17H21C22.1 17 23 16.1 23 15V13C23 11.9 22.1 11 21 11ZM6 9H14V11H6V9ZM21 15H3V13H21V15Z" /></BaseIcon>;
export const FighterIcon = (props) => <BaseIcon {...props}><path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" /></BaseIcon>;
export const BomberIcon = (props) => <BaseIcon {...props}><path d="M22 15V13L13 10V4C13 3.45 12.55 3 12 3C11.45 3 11 3.45 11 4V10L2 13V15L11 12.5V18.5L9 20V21.5L12 20.5L15 21.5V20L13 18.5V12.5L22 15ZM19 12L15 10.5V8.5L19 10V12ZM5 12L9 10.5V8.5L5 10V12Z" /></BaseIcon>;
export const SubmarineIcon = (props) => <BaseIcon {...props}><path d="M2 15c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-2H2v2zm19-4H3c-.55 0-1 .45-1 1v1h20v-1c0-.55-.45-1-1-1zm-6-4h-2V5h-2v2H9c-1.1 0-2 .9-2 2v1h10V9c0-1.1-.9-2-2-2z" /></BaseIcon>;
export const TransportIcon = (props) => <BaseIcon {...props}><path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 11.03V7c0-1.1-.9-2-2-2h-3V3c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v4.03l-1.28 1.01c-.26.08-.48.26-.6.5s-.14.52-.06.78L3.95 19zM9 3h6v2H9V3zm-5 4h16v3H4V7z" /></BaseIcon>;
export const DestroyerIcon = (props) => <BaseIcon {...props}><path d="M2 19h20v2H2zm18-4L15.5 7h-7L4 15h16zM11 5h2v2h-2z" /></BaseIcon>;
export const CruiserIcon = (props) => <BaseIcon {...props}><path d="M2 19h20v2H2zm19-4-3-8h-2V5h-3v2H9V5H6v2H4l-3 8h20zM8 7h2v2H8V7zm6 0h2v2h-2V7z" /></BaseIcon>;
export const CarrierIcon = (props) => <BaseIcon {...props}><path d="M2 19h20v2H2zm20-5H2v2h20v-2zM4 12h16V9H4v3zm5-5h6V5H9v2z" /></BaseIcon>;
export const BattleshipIcon = (props) => <BaseIcon {...props}><path d="M2 19h20v2H2zm20-4H2l1.5-6h17L22 15zM7 7h2v2H7V7zm8 0h2v2h-2V7zm-4-3h2v5h-2V4z" /></BaseIcon>;
export const FactoryIcon = (props) => <BaseIcon {...props}><path d="M3 20V4h3v10l5-6v6l5-6v6l5-6v12Z" /></BaseIcon>;

export const UnitIconResolver = ({ unitName, ...props }) => {
  switch (unitName) {
    case 'Infantry': return <InfantryIcon {...props} />;
    case 'Artillery': return <ArtilleryIcon {...props} />;
    case 'Tank': return <TankIcon {...props} />;
    case 'AA Gun': return <AntiAircraftIcon {...props} />;
    case 'Fighter': return <FighterIcon {...props} />;
    case 'Bomber': return <BomberIcon {...props} />;
    case 'Submarine': return <SubmarineIcon {...props} />;
    case 'Transport': return <TransportIcon {...props} />;
    case 'Destroyer': return <DestroyerIcon {...props} />;
    case 'Cruiser': return <CruiserIcon {...props} />;
    case 'Carrier': return <CarrierIcon {...props} />;
    case 'Battleship': return <BattleshipIcon {...props} />;
    case 'Industrial Complex': return <FactoryIcon {...props} />;
    default: return <InfantryIcon {...props} />;
  }
};
