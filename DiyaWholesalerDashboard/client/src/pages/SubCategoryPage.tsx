import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { fetchSubcategoriesByCategory, createSubcategory } from "@/services/category";

type SubCategory = {
  id: string;
  name: string;
};

export default function SubCategoryPage() {
  const [, params] = useRoute("/categories/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const categoryId = params?.id || "";

  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [newSub, setNewSub] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!categoryId) return;
    const data = await fetchSubcategoriesByCategory(categoryId);
    setSubcategories(data);
  };

  useEffect(() => {
    load();
  }, [categoryId]);

  async function handleCreate() {
    if (!newSub.trim()) return;

    try {
      setLoading(true);
      await createSubcategory({
        categoryId: categoryId,
        name: newSub.trim(),
      });
      setNewSub("");
      await load();

      toast({
        title: "Subcategory created",
        description: "Added successfully",
        className: "bg-green-50 border-green-200 text-green-800",
      });
    } catch (err: any) {
      toast({
        title: "Failed to create",
        description: err?.response?.data?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/categories")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold">
            Manage Subcategories
          </h1>
          <p className="text-sm text-gray-500">
            Structure your catalog better
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Subcategory</CardTitle>
        </CardHeader>

        <CardContent className="flex gap-3">
          <Input
            placeholder="Eg: String Lights / Brass Diyas"
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
          />
          <Button onClick={handleCreate} disabled={loading}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Subcategories</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">
          {subcategories.length === 0 && (
            <p className="text-sm text-gray-500">
              No subcategories yet.
            </p>
          )}

          {subcategories.map((s) => (
            <div
              key={s.id}
              className="border rounded-md px-4 py-2 hover:bg-gray-50"
            >
              {s.name}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
