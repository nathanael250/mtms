import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";

const initialForm = {
  full_name: "",
  phone: "",
  email: "",
  category_id: "",
  custom_category: "",
  company_name: "",
  address: "",
  notes: "",
};

export default function ContactsPage() {
  const { token, user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  async function loadPageData() {
    try {
      const [contactsData, categoriesData] = await Promise.all([
        apiFetch("/contacts", { token }),
        apiFetch("/contacts/categories", { token }),
      ]);
      setContacts(contactsData.contacts || []);
      setCategories(categoriesData.categories || []);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    loadPageData();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      await apiFetch("/contacts", {
        method: "POST",
        token,
        body: {
          ...form,
          category_id: Number(form.category_id),
          created_by: user.id,
        },
      });
      setForm(initialForm);
      setIsModalOpen(false);
      setSuccess("Contact created successfully.");
      loadPageData();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openModal() {
    setError("");
    setSuccess("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setForm(initialForm);
    setError("");
  }

  const filteredContacts = contacts.filter((contact) => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !search ||
      [
        contact.full_name,
        contact.phone,
        contact.email,
        contact.company_name,
        contact.address,
        contact.category_name,
        contact.custom_category,
        contact.notes,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search));

    const matchesCategory =
      !selectedCategory ||
      String(contact.category_id) === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout
      title="Contacts"
      description="Store clients, suppliers, photographers, and other work contacts."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Contact List</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review people and companies you work with, then add new contacts when needed.
            </p>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--brand-600)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-700)]"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        {error && !isModalOpen ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm md:rounded-[30px]">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6 md:py-5">
            <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, phone, email, company..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-500)] focus:bg-white md:max-w-md"
              />
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[var(--brand-500)] focus:bg-white md:max-w-[220px]"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-slate-500">
              {filteredContacts.length} contact{filteredContacts.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {filteredContacts.map((contact) => (
              <article key={contact.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-5 text-slate-900">
                      {contact.full_name}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {contact.category_name}
                      {contact.custom_category
                        ? ` • ${contact.custom_category}`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--brand-100)] px-2.5 py-1 text-[10px] font-semibold capitalize text-[var(--brand-700)]">
                    {contact.category_name}
                  </span>
                </div>

                {contact.notes ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                    {contact.notes}
                  </p>
                ) : null}

                <div className="mt-4 grid gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                  <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2">
                    <span className="font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Phone
                    </span>
                    <span className="truncate">{contact.phone || "No phone"}</span>
                  </div>
                  <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2">
                    <span className="font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Email
                    </span>
                    <span className="truncate">{contact.email || "No email"}</span>
                  </div>
                  <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2">
                    <span className="font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Company
                    </span>
                    <span className="truncate">
                      {contact.company_name || "No company"}
                    </span>
                  </div>
                  <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-2">
                    <span className="font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Address
                    </span>
                    <span className="truncate">
                      {contact.address || "No address"}
                    </span>
                  </div>
                </div>
              </article>
            ))}
            {!filteredContacts.length ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                No contacts match your search or filter.
              </p>
            ) : null}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full border-collapse text-left">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Full Name",
                    "Category",
                    "Phone",
                    "Email",
                    "Company",
                    "Address",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-t border-slate-100 transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-5">
                      <p className="text-sm font-semibold text-slate-900">
                        {contact.full_name}
                      </p>
                      {contact.notes ? (
                        <p className="mt-1 max-w-[260px] text-xs text-slate-500">
                          {contact.notes}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">
                      {contact.category_name}
                      {contact.custom_category ? ` • ${contact.custom_category}` : ""}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">
                      {contact.phone || "No phone"}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">
                      {contact.email || "No email"}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">
                      {contact.company_name || "No company"}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500">
                      {contact.address || "No address"}
                    </td>
                  </tr>
                ))}
                {!filteredContacts.length ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      No contacts match your search or filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Add Contact</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a new contact for clients, suppliers, staff collaborators, or other partners.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              {[
                ["full_name", "Full name"],
                ["phone", "Phone"],
                ["email", "Email"],
                ["company_name", "Company name"],
                ["address", "Address"],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-600">
                    {label}
                  </span>
                  <input
                    value={form[key]}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  />
                </label>
              ))}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  Category
                </span>
                <select
                  value={form.category_id}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  Custom category
                </span>
                <input
                  value={form.custom_category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      custom_category: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-600">
                  Notes
                </span>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows="4"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-[var(--brand-700)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-600)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Save Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
