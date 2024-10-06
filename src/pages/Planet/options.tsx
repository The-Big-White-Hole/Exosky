import { useState } from 'react';

export function Options({ toggleEquatorial, toggleGalactic }: { toggleEquatorial: (isVisible: boolean) => void; toggleGalactic: (isVisible: boolean) => void }) {
  const [isEquatorialVisible, setEquatorialVisible] = useState(false);
  const [isGalacticVisible, setGalacticVisible] = useState(false);

  const handleEquatorialToggle = () => {
    setEquatorialVisible(!isEquatorialVisible);
    toggleEquatorial(!isEquatorialVisible);
  };

  const handleGalacticToggle = () => {
    setGalacticVisible(!isGalacticVisible);
    toggleGalactic(!isGalacticVisible);
  };

  return (
    <div className="options-panel">
      <button onClick={handleEquatorialToggle}>
        {isEquatorialVisible ? 'Hide Equatorial Grid' : 'Show Equatorial Grid'}
      </button>
      <button onClick={handleGalacticToggle}>
        {isGalacticVisible ? 'Hide Galactic Grid' : 'Show Galactic Grid'}
      </button>
    </div>
  );
}

