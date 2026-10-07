import type { PostWithRelations } from '@/types';
import { PostCard } from './PostCard';
import { FeaturedPostCard } from './FeaturedPostCard';
import { EmptyState } from './EmptyState';

export interface PostListProps {
  posts: PostWithRelations[];
  emptyMessage?: string;
  showFeatured?: boolean;
}

/**
 * PostList component - renders a list of PostCard components
 * with an empty state message when no posts are available.
 * Supports featured post layout and staggered entrance animations.
 *
 * Requirements:
 * - Show empty-state message when no posts (Req 1.10)
 * - Modern aesthetic with animations
 * - Support featured post variant
 */
export function PostList({
  posts,
  emptyMessage = 'No posts available.',
  showFeatured = false,
}: PostListProps) {
  if (posts.length === 0) {
    return <EmptyState message="No posts yet" suggestion={emptyMessage} />;
  }

  // If showing featured, separate first post
  const featuredPost = showFeatured && posts.length > 0 ? posts[0] : null;
  const regularPosts = showFeatured && posts.length > 0 ? posts.slice(1) : posts;

  return (
    <div className="space-y-8">
      {/* Featured Post */}
      {featuredPost && (
        <div
          className="animate-fade-in-up"
          style={{ animationDelay: '0ms' }}
        >
          <FeaturedPostCard post={featuredPost} />
        </div>
      )}

      {/* Regular Posts Grid with staggered animations */}
      {regularPosts.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {regularPosts.map((post, index) => (
            <div
              key={post.id}
              className="animate-fade-in-up"
              style={{ animationDelay: `${(index + (featuredPost ? 1 : 0)) * 100}ms` }}
            >
              <PostCard post={post} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
