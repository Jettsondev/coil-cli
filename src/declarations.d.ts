declare module 'ink-big-text' {
  import { FC } from 'react';
  interface BigTextProps {
    text: string;
    font?:
      | 'block'
      | 'slick'
      | 'tiny'
      | 'grid'
      | 'pallet'
      | 'shade'
      | 'simple'
      | 'simpleBlock'
      | 'simple3d'
      | '3d'
      | 'chrome'
      | 'huge';
    space?: boolean;
    colors?: string[];
    backgroundColor?: string;
    letterSpacing?: number;
    lineHeight?: number;
    align?: 'left' | 'center' | 'right';
  }
  const BigText: FC<BigTextProps>;
  export default BigText;
}

declare module 'ink-gradient' {
  import { FC, ReactNode } from 'react';
  interface GradientProps {
    name?:
      | 'cristal'
      | 'teen'
      | 'mind'
      | 'morning'
      | 'vice'
      | 'passion'
      | 'fruit'
      | 'instagram'
      | 'atlas'
      | 'retro'
      | 'summer'
      | 'pastel'
      | 'rainbow';
    colors?: string[];
    children?: ReactNode;
  }
  const Gradient: FC<GradientProps>;
  export default Gradient;
}
