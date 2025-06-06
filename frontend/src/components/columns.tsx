"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Article = {
    id: number;
    title: string;
    source_url: string;
    thumbnail_url: string | null;
    ai_summary: string | null;
    ai_tags: string[] | null; // English topics
    ai_image_path: string | null;
    topics_es: string | null; // Spanish translated topics (comma-separated string)
    topics_ht: string | null; // Haitian Creole translated topics (comma-separated string)
    publication_date: string | null; // Add publication_date
  }

  type ActionHandlers = {
    handleProcessAi: (articleId: number, featureType: 'summary' | 'tags' | 'image' | 'translations') => void;
    handleDeleteArticle: (articleId: number) => void;
  };
  
  export const getColumns = ({ handleProcessAi, handleDeleteArticle }: ActionHandlers): ColumnDef<Article>[] => [
    {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "source_url",
    header: "URL",
    cell: ({ row }) => {
        const article = row.original
        return <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{article.source_url}</a>
    }
  },
  {
    accessorKey: "thumbnail_url",
    header: "Thumbnail",
    cell: ({ row }) => {
        const article = row.original
        return article.thumbnail_url ? <img src={article.thumbnail_url} alt="Thumbnail" className="max-w-20 max-h-20 object-cover" /> : "N/A"
    }
  },
  {
    accessorKey: "publication_date",
    header: "Date",
    cell: ({ row }) => {
        const article = row.original
        return article.publication_date ? new Date(article.publication_date).toLocaleDateString() : 'N/A'
    }
  },
  {
    accessorKey: "ai_summary",
    header: "AI Summary",
  },
  {
    accessorKey: "ai_tags",
    header: "AI Tags",
    cell: ({ row }) => {
        const article = row.original
        return article.ai_tags ? article.ai_tags.join(', ') : ''
    }
  },
  {
    accessorKey: "ai_image_path",
    header: "AI Image",
    cell: ({ row }) => {
        const article = row.original
        return article.ai_image_path ? <img src={article.ai_image_path} alt="AI Image" className="max-w-20 max-h-20 object-cover" /> : "N/A"
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const article = row.original
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(article.id.toString())}
            >
              Copy article ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleProcessAi(article.id, 'summary')}>Rerun Summary</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleProcessAi(article.id, 'tags')}>Rerun Tags</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleProcessAi(article.id, 'image')}>Rerun Image</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleProcessAi(article.id, 'translations')}>Rerun Translations</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDeleteArticle(article.id)} className="text-red-600">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
