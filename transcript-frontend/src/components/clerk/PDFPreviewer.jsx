export default function PDFPreviewer({ title, url }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-blue-800 hover:underline"
          >
            Open
          </a>
        )}
      </div>
      <div className="bg-gray-50">
        {url ? (
          <iframe
            title={title}
            src={url}
            className="w-full h-64"
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-sm text-gray-500">
            Preview not available (mock)
          </div>
        )}
      </div>
    </div>
  );
}

