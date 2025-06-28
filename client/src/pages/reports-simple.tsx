import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Reports() {
  return (
    <Layout title="Relatórios">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Relatórios de Atividades</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Página de relatórios funcionando!</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}