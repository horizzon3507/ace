import React from 'react';
import { Composition } from 'remotion';
import { AceFunk } from './AceFunk';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AceFunk"
      component={AceFunk}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
