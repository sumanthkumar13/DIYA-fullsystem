import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fetchCategories, createCategoryWithImage } from "@/services/category";
import { uploadImageUnsignedToCloudinary, validateImageFile } from "@/lib/cloudinary";

type Category = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

export default function CategoriesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const inputRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const loadCategories = async () => {
    const data = await fetchCategories();
    setCategories(data || []);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async () => {
    if (!newCategory.trim() || loading) return;

    try {
      setLoading(true);
      setImageError(null);
      let uploadedUrl: string | null = null;
      if (imageFile) {
        setImageUploading(true);
        setImageProgress(0);
        const { secureUrl } = await uploadImageUnsignedToCloudinary({
          file: imageFile,
          onProgress: (p) => setImageProgress(p),
        });
        uploadedUrl = secureUrl;
      }

      await createCategoryWithImage(newCategory.trim(), uploadedUrl);
      setNewCategory("");
      setImageFile(null);
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
      setImageProgress(0);
      await loadCategories();

      toast({
        title: "Category created",
        description: "Category has been added successfully.",
        className: "bg-green-50 border-green-200 text-green-800",
      });

      // ✅ focus back for fast entry
      inputRef.current?.focus();
    } catch (err: any) {
      toast({
        title: "Failed to create category",
        description: err?.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setImageUploading(false);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">
          Categories
        </h1>
        <p className="text-sm text-gray-500">
          Manage product categories for your business
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Category</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              placeholder="Eg: Pipes, Lights, Oils, Groceries"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <Button onClick={handleCreate} disabled={loading || imageUploading || !newCategory.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              {imageUploading ? (imageProgress ? `Uploading (${imageProgress}%)` : "Uploading…") : loading ? "Adding..." : "Add"}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setImageError(null);
                if (!f) {
                  setImageFile(null);
                  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                  setImagePreviewUrl(null);
                  return;
                }
                const err = validateImageFile(f);
                if (err) {
                  setImageError(err);
                  setImageFile(null);
                  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                  setImagePreviewUrl(null);
                  return;
                }
                setImageFile(f);
                if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                setImagePreviewUrl(URL.createObjectURL(f));
              }}
            />

            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={loading || imageUploading}>
              {imageFile ? "Change image" : "Select image"}
            </Button>

            <div className="h-12 w-12 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-medium text-gray-400">No Image</span>
              )}
            </div>
            {imageError ? <span className="text-xs text-red-600">{imageError}</span> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Categories</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          {categories.length === 0 && (
            <div className="text-sm text-gray-500 py-8 text-center">
              No categories yet. Create your first category above 👆
            </div>
          )}

          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between border rounded-md px-4 py-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => setLocation(`/categories/${cat.id}`)}
            >
              <span className="font-medium flex items-center gap-3">
                <span className="h-8 w-8 rounded-md bg-gray-100 overflow-hidden flex items-center justify-center">
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-semibold text-gray-400">No Image</span>
                  )}
                </span>
                {cat.name}
              </span>
              <span className="text-xs text-gray-400">
                Open →
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
