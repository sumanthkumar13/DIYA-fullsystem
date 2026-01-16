import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

import {
  fetchSubcategoriesByCategory,
  createSubcategory,
  fetchCategories,
} from "@/services/category";

type SubCategory = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
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
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-gray-400">
                      (Products will group under this)
                    </span>
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
