interface Props {
  online: boolean;
  size?: number;
}

export default function PresenceDot({ online, size = 10 }: Props) {
  return (
    <span
      className={`presence-dot ${online ? 'is-online' : 'is-offline'}`}
      style={{ inlineSize: size, blockSize: size }}
      title={online ? 'آنلاین' : 'آفلاین'}
    />
  );
}
