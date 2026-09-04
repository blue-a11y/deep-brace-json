import Shuffle from './react-bits/shuffle';

const AnimatedBrand = () => (
  <Shuffle
    text="DeepBrace JSON"
    tag="span"
    shouldTriggerOnHover={false}
    shouldLoop
    loopDelay={5}
    delay={1.5}
    duration={0.6}
    stagger={0.05}
    textAlign="left"
    className="brand-wordmark shrink-0 font-logo"
  />
);

export default AnimatedBrand;
