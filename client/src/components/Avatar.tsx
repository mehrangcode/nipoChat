import { initials } from '../utils/format';

interface Props {
  name: string;
  url?: string | null;
  size?: number;
}

export default function Avatar({ name, url, size = 44 }: Props) {
  const style = { inlineSize: size, blockSize: size, fontSize: size * 0.4 };
  if (url) {
    return <img className="avatar" src={url} alt={name} style={style} />;
  }
  return (
    <div className="avatar avatar-fallback" style={style} aria-hidden>
      {initials(name)}
    </div>
  );
}
