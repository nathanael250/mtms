import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  FileText,
  FileUp,
  Folder,
  Search,
  Upload,
  X,
} from "lucide-react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { API_BASE_URL, apiFetch } from "../../lib/api";

const initialUploadForm = {
  job_id: "",
  category_id: "",
  title: "",
  description: "",
  file: null,
};

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatFileSize(value) {
  if (!value) {
    return "Unknown size";
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function getDocumentUrl(document) {
  if (!document.google_drive_file_url) {
    return "";
  }

  if (document.google_drive_file_url.startsWith("/uploads/")) {
    return `${API_BASE_URL.replace("/api", "")}${document.google_drive_file_url}`;
  }

  return document.google_drive_file_url;
}

function StatusBadge({ status }) {
  const classes = {
    pending_approval: "bg-orange-50 text-orange-700",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
        classes[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status?.replace("_", " ")}
    </span>
  );
}

export default function DocLibraryPage() {
  const { token, user } = useAuth();
  const { view } = useParams();
  const isAdmin = user?.role === "admin";
  const [documents, setDocuments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [activeStatus, setActiveStatus] = useState("approved");
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadForm, setUploadForm] = useState(initialUploadForm);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const statusByView = {
      approved: "approved",
      "my-uploads": "my",
    };

    if (statusByView[view]) {
      setActiveStatus(statusByView[view]);
    }
  }, [view]);

  async function loadPageData() {
    try {
      const [documentsResponse, jobsResponse, categoriesResponse] = await Promise.all([
        apiFetch("/documents", { token }),
        apiFetch("/jobs", { token }),
        apiFetch("/document-categories?status=active", { token }),
      ]);

      setDocuments(documentsResponse.documents || []);
      setJobs(jobsResponse.jobs || []);
      setCategories(categoriesResponse.categories || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadPageData();
  }, [token]);

  const visibleDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesStatus =
        activeStatus === "all" ||
        (activeStatus === "my" && document.uploaded_by === user?.id) ||
        document.status === activeStatus;
      const matchesCategory =
        !selectedCategory || document.category_id === selectedCategory.id;
      const matchesSearch =
        !query ||
        document.title.toLowerCase().includes(query) ||
        document.job_title.toLowerCase().includes(query) ||
        document.category_name.toLowerCase().includes(query) ||
        document.uploaded_by_name.toLowerCase().includes(query) ||
        document.original_file_name.toLowerCase().includes(query);

      return matchesStatus && matchesCategory && matchesSearch;
    });
  }, [documents, activeStatus, searchTerm, selectedCategory, user?.id]);

  const categoryFolders = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        documentCount: documents.filter((document) => {
          const matchesStatus =
            activeStatus === "all" ||
            (activeStatus === "my" && document.uploaded_by === user?.id) ||
            document.status === activeStatus;
          return matchesStatus && document.category_id === category.id;
        }).length,
      })),
    [categories, documents, activeStatus, user?.id]
  );

  const statusCounts = documents.reduce(
    (counts, document) => ({
      ...counts,
      [document.status]: (counts[document.status] || 0) + 1,
    }),
    {}
  );

  async function handleUpload(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("related_type", "document");
      formData.append("job_id", uploadForm.job_id);
      formData.append("category_id", uploadForm.category_id);
      formData.append("title", uploadForm.title);
      formData.append("description", uploadForm.description);
      formData.append("file", uploadForm.file);

      await apiFetch("/documents/upload", {
        method: "POST",
        token,
        body: formData,
      });

      setUploadForm(initialUploadForm);
      setIsUploadOpen(false);
      setSuccess("Document uploaded successfully.");
      loadPageData();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusTabs = [
    ["approved", "Library Documents"],
    ["my", "My Uploaded Documents"],
    ...(isAdmin ? [["all", "All Documents"]] : []),
  ];

  return (
    <DashboardLayout
      title="Doc Library"
      description="Upload and manage job-related documents in Google Drive."
    >
      {error ? (
        <div className="mb-5 rounded-[8px] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mb-5 rounded-[8px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">
              {selectedCategory ? selectedCategory.name : "Document Folders"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {selectedCategory
                ? "Documents inside this category."
                : "Open a category folder to view uploaded documents."}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full md:w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search folders and documents..."
                className="w-full rounded-[8px] border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-400)]"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-[var(--brand-700)] px-4 py-3 text-sm font-semibold text-white"
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {statusTabs.map(([status, label]) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                setActiveStatus(status);
                setSelectedCategory(null);
              }}
              className={`rounded-[8px] px-3 py-2 text-xs font-bold ${
                activeStatus === status
                  ? "bg-[var(--brand-600)] text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {label}{" "}
              {status === "my"
                ? `(${documents.filter((document) => document.uploaded_by === user?.id).length})`
                : status !== "all"
                  ? `(${statusCounts[status] || 0})`
                  : ""}
            </button>
          ))}
        </div>

        {selectedCategory ? (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="mb-4 inline-flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to folders
            </button>

            <div className="overflow-x-auto rounded-[8px] border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Job</th>
                    <th className="px-4 py-3">Uploaded By</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {visibleDocuments.map((document) => (
                    <tr key={document.id} className="align-top hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-blue-50 text-blue-700">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            {getDocumentUrl(document) ? (
                              <a
                                href={getDocumentUrl(document)}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-slate-900 hover:text-[var(--brand-700)]"
                              >
                                {document.title}
                              </a>
                            ) : (
                              <p className="font-semibold text-slate-900">
                                {document.title}
                              </p>
                            )}
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {document.original_file_name}
                            </p>
                            {document.status === "rejected" &&
                            document.review_comment ? (
                              <p className="mt-2 text-xs text-rose-600">
                                Reason: {document.review_comment}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {document.job_title}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {document.uploaded_by_name}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={document.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                        {formatFileSize(document.file_size)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                        {formatDate(document.created_at)}
                      </td>
                    </tr>
                  ))}
                  {!visibleDocuments.length ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-sm text-slate-500"
                      >
                        No documents found in this category.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {categoryFolders
              .filter((category) => {
                const query = searchTerm.trim().toLowerCase();
                return !query || category.name.toLowerCase().includes(query);
              })
              .map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className="group rounded-[8px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[var(--brand-300)] hover:bg-blue-50/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-blue-100 text-[var(--brand-700)] transition group-hover:bg-[var(--brand-600)] group-hover:text-white">
                      <Folder className="h-7 w-7" />
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-sm">
                      {category.documentCount}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-bold text-slate-950">
                    {category.name}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                    {category.description || "Document category folder"}
                  </p>
                </button>
              ))}
            {!categoryFolders.length ? (
              <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                No document categories found.
              </div>
            ) : null}
          </div>
        )}
      </section>

      {isUploadOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Upload Document
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Uploaded files are stored directly in the document library.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="rounded-[8px] border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleUpload}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-600">
                    Job / Project
                  </span>
                  <select
                    value={uploadForm.job_id}
                    onChange={(event) =>
                      setUploadForm((current) => ({
                        ...current,
                        job_id: event.target.value,
                      }))
                    }
                    className="w-full rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  >
                    <option value="">Select project</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-600">
                    Document Category
                  </span>
                  <select
                    value={uploadForm.category_id}
                    onChange={(event) =>
                      setUploadForm((current) => ({
                        ...current,
                        category_id: event.target.value,
                      }))
                    }
                    className="w-full rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  Document Title
                </span>
                <input
                  value={uploadForm.title}
                  onChange={(event) =>
                    setUploadForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="w-full rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  Description
                </span>
                <textarea
                  value={uploadForm.description}
                  onChange={(event) =>
                    setUploadForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows="3"
                  className="w-full rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>

              <label className="block rounded-[8px] border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
                <FileUp className="mx-auto h-6 w-6 text-[var(--brand-600)]" />
                <span className="mt-2 block text-sm font-semibold text-slate-800">
                  {uploadForm.file?.name || "Choose file"}
                </span>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,.xlsx,.jpg,.jpeg,.png,.mp4"
                  onChange={(event) =>
                    setUploadForm((current) => ({
                      ...current,
                      file: event.target.files?.[0] || null,
                    }))
                  }
                  className="sr-only"
                />
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="rounded-[8px] border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-[8px] bg-[var(--brand-700)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Uploading..." : "Submit for Approval"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
