import React from 'react';

interface Barber {
  id: number | string;
  name: string;
  is_active: boolean;
  image_url?: string | null;
  notes?: string | null;
}

interface TeamShowcaseProps {
  barbers: Barber[];
}

const BarberProfileSVG: React.FC = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const TeamShowcase: React.FC<TeamShowcaseProps> = ({ barbers }) => {
  return (
    <section id="team" className="page-section section-team">
      <div className="section-container">
        <div className="section-header">
          <h2 className="section-title">Our Barbers</h2>
          <p className="section-subtitle">Meet the highly skilled team of professionals at Foundry Barber Studio.</p>
        </div>

        <div className="team-grid">
          {barbers.map((barber) => (
            <div key={barber.id} className="team-card">
              <div className="team-avatar-container">
                {barber.image_url ? (
                  <img
                    src={barber.image_url}
                    alt={barber.name}
                    className="team-avatar"
                  />
                ) : (
                  <div className="team-avatar-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '50%' }}>
                    <BarberProfileSVG />
                  </div>
                )}
              </div>
              <div className="team-info">
                <h3 className="team-name">{barber.name}</h3>
                {barber.notes && (
                  <p className="team-bio" style={{ fontSize: '0.88rem', color: '#a1a1aa', marginTop: '6px', lineHeight: '1.4' }}>
                    {barber.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
