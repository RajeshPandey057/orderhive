<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ChevronRightIcon from '~icons/lucide/chevron-right';

	let {
		items,
		sections = []
	}: {
		items: {
			title: string;
			url: string;
			icon?: typeof ChevronRightIcon;
			isActive?: boolean;
			external?: boolean;
			items?: {
				title: string;
				url: string;
			}[];
		}[];
		sections?: {
			title: string;
			items: {
				title: string;
				url: string;
				isActive?: boolean;
				icon?: typeof ChevronRightIcon;
				external?: boolean;
			}[];
		}[];
	} = $props();

	function handleSectionNavigate(event: MouseEvent, url: string, external?: boolean) {
		event.preventDefault();
		if (external) {
			window.open(url, '_blank', 'noopener,noreferrer');
			return;
		}
		goto(url);
	}
</script>

{#if sections.length > 0}
	{#each sections as section, idx (section.title)}
		<Sidebar.Group>
			<Sidebar.GroupLabel class="uppercase tracking-wide text-[#8D8D8D]">
				{section.title}
			</Sidebar.GroupLabel>
			<Sidebar.Menu>
				{#each section.items as item (item.title)}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton tooltipContent={item.title} isActive={item.isActive}>
							{#snippet child({ props })}
								<a
									href={item.url}
									{...props}
									target={item.external ? '_blank' : undefined}
									rel={item.external ? 'noopener noreferrer' : undefined}
									onclick={(event) => handleSectionNavigate(event, item.url, item.external)}
								>
									{#if item.icon}
										<item.icon />
									{/if}
									<span>{item.title}</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/each}
			</Sidebar.Menu>
		</Sidebar.Group>
		{#if idx < sections.length - 1}
			<Sidebar.Separator class="mx-2 my-1" />
		{/if}
	{/each}
{:else}
	<Sidebar.Group>
		<Sidebar.Menu>
			{#each items as item (item.title)}
				{#if item?.items}
					<Collapsible.Root open={item.isActive} class="group/collapsible">
						{#snippet child({ props })}
							<Sidebar.MenuItem {...props}>
								<Collapsible.Trigger>
									{#snippet child({ props })}
										<Sidebar.MenuButton
											{...props}
											tooltipContent={item.title}
											isActive={item.isActive}
										>
											{#if item.icon}
												<item.icon />
											{/if}
											<span>{item.title}</span>
											{#if item.items}
												<ChevronRightIcon
													class="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
												/>
											{/if}
										</Sidebar.MenuButton>
									{/snippet}
								</Collapsible.Trigger>
								<Collapsible.Content>
									<Sidebar.MenuSub>
										{#each item.items ?? [] as subItem (subItem.title)}
											<Sidebar.MenuSubItem>
												<Sidebar.MenuSubButton>
													{#snippet child({ props })}
														<a href={subItem.url} {...props}>
															<span>{subItem.title}</span>
														</a>
													{/snippet}
												</Sidebar.MenuSubButton>
											</Sidebar.MenuSubItem>
										{/each}
									</Sidebar.MenuSub>
								</Collapsible.Content>
							</Sidebar.MenuItem>
						{/snippet}
					</Collapsible.Root>
				{:else}
					<Sidebar.MenuItem>
						<Sidebar.MenuButton tooltipContent={item.title} isActive={item.isActive}>
							{#snippet child({ props })}
								<a
									href={item.url}
									{...props}
									target={item.external ? '_blank' : undefined}
									rel={item.external ? 'noopener noreferrer' : undefined}
								>
									{#if item.icon}
										<item.icon />
									{/if}
									<span>{item.title}</span>
								</a>
							{/snippet}
						</Sidebar.MenuButton>
					</Sidebar.MenuItem>
				{/if}
			{/each}
		</Sidebar.Menu>
	</Sidebar.Group>
{/if}
