import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fetchCategories, createCategory } from "@/services/category";

type Category = {
  id: string;
  name: string;
};

export default function CategoriesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const inputRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);

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
      await createCategory(newCategory.trim());
      setNewCategory("");
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

        <CardContent className="flex gap-3">
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
          <Button
            onClick={handleCreate}
            disabled={loading || !newCategory.trim()}
          >
            <Plus className="h-4 w-4 mr-1" />
            {loading ? "Adding..." : "Add"}
          </Button>
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
              <span className="font-medium">{cat.name}</span>
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
