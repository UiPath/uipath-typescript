interface CenteredMessageProps {
  text: string;
  tone?: 'muted' | 'error';
}

function CenteredMessage({ text, tone = 'muted' }: CenteredMessageProps) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <p
        className={`text-sm text-center ${
          tone === 'error' ? 'text-red-600' : 'text-gray-500'
        }`}
      >
        {text}
      </p>
    </div>
  );
}

export default CenteredMessage;
