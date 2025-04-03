<script lang="ts">
    import "../app.css";
    let { children } = $props();
</script>

<div class="w-full">
    <header
        class="flex justify-between items-center py-8 px-16 opacity-100 text-white bg-[#16473D] w-full border-b-2 border-white"
    >
        <a href="/" class="text-2xl font-bold">OliOli Casino</a>
        <nav class="flex gap-8">
            <a href="/blackjack">Blackjack</a>
            <a href="/about">About Us</a>
            <a href="/contact">Contact Us</a>
        </nav>
    </header>
    <div class="p-4 mx-16">
        {@render children()}
    </div>
    <footer class="mt-8 text-center">
        <p>&copy; 2025 Casino. All rights reserved.</p>
    </footer>
</div>
