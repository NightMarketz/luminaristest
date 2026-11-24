/**
 * KnowledgeGraphData — o grafo de conhecimento (tabelas, campos e relações) que o KnowledgeGraphService monta e o
 * KnowledgeGraphRepository grava. Tipo de dado em models/ (MODULE-BOUNDARIES PR-1b, `L4`: o repositório não importa
 * o service).
 */
export interface KnowledgeGraphData {
    tables: {
        id: string;
        name: string;
        label: string;
        category: string;
        fields: {
            name: string;
            label: string;
            type: string;
            required: boolean;
            readOnly?: boolean;
            hidden?: boolean;
            options?: string[];
            relation?: {
                targetTable: string;
                displayField: string;
            };
        }[];
    }[];
    relations: {
        sourceTable: string;
        targetTable: string;
        field: string;
        type: '1:1' | '1:N';
    }[];
}
