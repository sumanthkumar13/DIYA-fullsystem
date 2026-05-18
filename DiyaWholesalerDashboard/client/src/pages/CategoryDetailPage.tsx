import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { uploadImageUnsignedToCloudinary, validateImageFile } from "@/lib/cloudinary";

import {
  fetchSubcategoriesByCategory,
  createSubcategory,
  fetchCategories,
  renameCategory,
  renameSubcategory,
} from "@/services/category";

type SubCategory = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

type Category = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

export default function CategoryDetailPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/categories/:categoryId");
  const categoryId = params?.categoryId;

  const { toast } = useToast();

  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [newSubName, setNewSubName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPage, setLoadingPage] = useState(true);

  const [catImageUploading, setCatImageUploading] = useState(false);
  const [catImageProgress, setCatImageProgress] = useState(0);
  const catFileRef = useRef<HTMLInputElement | null>(null);

  const [subImageUploadingId, setSubImageUploadingId] = useState<string | null>(null);
  const [subImageProgress, setSubImageProgress] = useState(0);

  async function load() {
    try {
      setLoadingPage(true);

      // fetch category list & extract current
      const allCats = await fetchCategories();
      const target = allCats.find((c: Category) => c.id === categoryId);
      setCategory(target || null);

      const list = await fetchSubcategoriesByCategory(categoryId!);
      setSubcategories(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPage(false);
    }
  }

  useEffect(() => {
    if (categoryId) load();
  }, [categoryId]);

  async function uploadAndSaveCategoryImage(file: File) {
    if (!category) return;
    const err = validateImageFile(file);
    if (err) {
      toast({ title: "Invalid image", description: err, variant: "destructive" });
      return;
    }
    setCatImageUploading(true);
    setCatImageProgress(0);
    try {
      const { secureUrl } = await uploadImageUnsignedToCloudinary({
        file,
        onProgress: (p) => setCatImageProgress(p),
      });
      await renameCategory(category.id, category.name, secureUrl);
      toast({ title: "Category image updated", className: "bg-green-50 border-green-200 text-green-800" });
      await load();
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCatImageUploading(false);
    }
  }

  async function uploadAndSaveSubcategoryImage(sub: SubCategory, file: File) {
    const err = validateImageFile(file);
    if (err) {
      toast({ title: "Invalid image", description: err, variant: "destructive" });
      return;
    }
    setSubImageUploadingId(sub.id);
    setSubImageProgress(0);
    try {
      const { secureUrl } = await uploadImageUnsignedToCloudinary({
        file,
        onProgress: (p) => setSubImageProgress(p),
      });
      await renameSubcategory(sub.id, sub.name, secureUrl);
      toast({ title: "Subcategory image updated", className: "bg-green-50 border-green-200 text-green-800" });
      await load();
    } catch (e: any) {
      toast({
        title: "Upload failed",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubImageUploadingId(null);
    }
  }

  async function handleCreate() {
    if (!newSubName.trim()) return;

    try {
      setLoading(true);
      await createSubcategory({
  categoryId: categoryId!,
  name: newSubName.trim(),
});


      setNewSubName("");
      await load();

      toast({
        title: "Subcategory Added",
        description: "Successfully created subcategory",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    } catch (err: any) {
      toast({
        title: "Failed to create subcategory",
        description:
          err?.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/business")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <h1 className="text-2xl font-display font-bold">
              {category?.name || "Category"}
            </h1>
            <p className="text-sm text-gray-500">
              Manage subcategories under this category
            </p>
          </div>
        </div>

        {/* Category image */}
        {!loadingPage && category && (
          <Card>
            <CardHeader>
              <CardTitle>Category image</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                  {category.imageUrl ? (
                    <img src={category.imageUrl} alt={category.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-gray-400">No Image</span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {catImageUploading ? `Uploading${catImageProgress ? ` (${catImageProgress}%)` : "…"}`
                    : "Upload an image to help retailers recognize this category."}
                </div>
              </div>

              <input
                ref={catFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAndSaveCategoryImage(f);
                  if (e.currentTarget) e.currentTarget.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => catFileRef.current?.click()}
                disabled={catImageUploading}
              >
                {category.imageUrl ? "Change image" : "Upload image"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* LOADING */}
        {loadingPage && (
          <Card>
            <CardContent className="py-10 text-center text-gray-500">
              Loading…
            </CardContent>
          </Card>
        )}

        {!loadingPage && (
          <>
            {/* CREATE SUBCATEGORY */}
            <Card>
              <CardHeader>
                <CardTitle>Create Subcategory</CardTitle>
              </CardHeader>

              <CardContent className="flex gap-3">
                <Input
                  placeholder="Eg: String Lights"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                />
                <Button onClick={handleCreate} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* LIST */}
            <Card>
              <CardHeader>
                <CardTitle>Subcategories</CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">
                {!subcategories.length && (
                  <p className="text-sm text-gray-500">
                    No subcategories added yet.
                  </p>
                )}

                {subcategories.map((s) => (
                  <div
                    key={s.id}
                    className="border rounded-md px-4 py-2 bg-white hover:bg-gray-50 flex justify-between"
                  >
                    <span className="font-medium flex items-center gap-3">
                      <span className="h-8 w-8 rounded-md bg-gray-100 overflow-hidden flex items-center justify-center">
                        {s.imageUrl ? (
                          <img src={s.imageUrl} alt={s.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-semibold text-gray-400">No Image</span>
                        )}
                      </span>
                      {s.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-gray-400">
                        (Products will group under this)
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        id={`subimg-${s.id}`}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadAndSaveSubcategoryImage(s, f);
                          if (e.currentTarget) e.currentTarget.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={subImageUploadingId === s.id}
                        onClick={() => document.getElementById(`subimg-${s.id}`)?.click()}
                      >
                        {subImageUploadingId === s.id
                          ? `Uploading${subImageProgress ? ` (${subImageProgress}%)` : "…"}`
                          : s.imageUrl
                          ? "Change image"
                          : "Upload image"}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
